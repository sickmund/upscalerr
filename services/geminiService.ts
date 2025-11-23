
import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";
import { MODEL_NAME } from "../constants";

// Helper to remove data URL prefix
const stripBase64Prefix = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

const getMimeType = (dataUrl: string) => {
  const match = dataUrl.match(/:(.*?);/);
  return match ? match[1] : 'image/png';
};

// Helper to generate descriptive text based on percentage (pixels / dimension)
const getMagnitudeDescription = (pixels: number, dimensionSize: number) => {
  if (pixels <= 0) return "";
  const percentage = (pixels / dimensionSize) * 100;
  
  if (percentage < 10) return "slightly";
  if (percentage < 30) return "moderately";
  if (percentage < 60) return "significantly";
  return "massively";
};

// The specific list of aspect ratios supported by the Gemini 3 Pro Image model
const VALID_ASPECT_RATIOS = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
];

const getClosestAspectRatio = (width: number, height: number): string => {
  const targetRatio = width / height;
  let closestRatio = VALID_ASPECT_RATIOS[0];
  let minDiff = Infinity;

  for (const ratioStr of VALID_ASPECT_RATIOS) {
    const [w, h] = ratioStr.split(':').map(Number);
    const currentRatio = w / h;
    const diff = Math.abs(currentRatio - targetRatio);
    
    if (diff < minDiff) {
      minDiff = diff;
      closestRatio = ratioStr;
    }
  }
  return closestRatio;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Safely retrieve API key from various potential sources
const getSystemApiKey = (): string | undefined => {
  const candidates = [
    typeof process !== 'undefined' ? process.env?.API_KEY : undefined,
    typeof process !== 'undefined' ? process.env?.REACT_APP_API_KEY : undefined,
    typeof process !== 'undefined' ? process.env?.VITE_API_KEY : undefined,
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_KEY : undefined,
    // @ts-ignore
    typeof import.meta !== 'undefined' ? import.meta.env?.API_KEY : undefined,
    // @ts-ignore
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_KEY : undefined,
  ];

  const found = candidates.find(key => key && typeof key === 'string' && key.length > 0);
  return found ? found.replace(/['"]/g, '').trim() : undefined;
};

// Retrieve Backend URL if configured
const getBackendUrl = (): string | undefined => {
  const candidates = [
    typeof process !== 'undefined' ? process.env?.REACT_APP_BACKEND_URL : undefined,
    typeof process !== 'undefined' ? process.env?.VITE_BACKEND_URL : undefined,
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_BACKEND_URL : undefined,
    // @ts-ignore
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BACKEND_URL : undefined,
  ];
  
  const found = candidates.find(url => url && typeof url === 'string' && url.length > 0);
  return found ? found.replace(/['"]/g, '').trim() : undefined;
}

// Crop image client-side if extensions are negative
const processImageForGeneration = async (
  originalImageStr: string,
  extension: { top: number; bottom: number; left: number; right: number },
  originalDims: { width: number; height: number }
): Promise<{ 
  processedImage: string; 
  processedExtension: { top: number; bottom: number; left: number; right: number };
  newDims: { width: number; height: number };
}> => {
  
  const { top, bottom, left, right } = extension;
  const hasCrop = top < 0 || bottom < 0 || left < 0 || right < 0;

  if (!hasCrop) {
    return { 
      processedImage: originalImageStr, 
      processedExtension: extension,
      newDims: originalDims
    };
  }

  const img = await loadImage(originalImageStr);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Could not create canvas context");

  const cropTop = top < 0 ? Math.abs(top) : 0;
  const cropBottom = bottom < 0 ? Math.abs(bottom) : 0;
  const cropLeft = left < 0 ? Math.abs(left) : 0;
  const cropRight = right < 0 ? Math.abs(right) : 0;

  const newWidth = originalDims.width - cropLeft - cropRight;
  const newHeight = originalDims.height - cropTop - cropBottom;

  if (newWidth <= 10 || newHeight <= 10) {
    throw new Error("Cropping removed the entire image. Please adjust sliders to keep some image content.");
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  ctx.drawImage(
    img,
    cropLeft, cropTop, newWidth, newHeight, 
    0, 0, newWidth, newHeight               
  );

  const processedImage = canvas.toDataURL(getMimeType(originalImageStr));

  return {
    processedImage,
    processedExtension: {
      top: Math.max(0, top),
      bottom: Math.max(0, bottom),
      left: Math.max(0, left),
      right: Math.max(0, right)
    },
    newDims: { width: newWidth, height: newHeight }
  };
};

export const generateExtendedImage = async (
  originalImage: string,
  config: GenerationConfig,
  userApiKey?: string
): Promise<string> => {
  
  const { width: originalWidth, height: originalHeight } = config.originalDimensions || { width: 1000, height: 1000 };

  // 1. Pre-process image (Crop)
  const { processedImage, processedExtension, newDims } = await processImageForGeneration(
    originalImage, 
    config.extension,
    { width: originalWidth, height: originalHeight }
  );

  // 2. Calculate Logic
  const totalWidth = newDims.width + processedExtension.left + processedExtension.right;
  const totalHeight = newDims.height + processedExtension.top + processedExtension.bottom;
  const apiAspectRatio = getClosestAspectRatio(totalWidth, totalHeight);

  const extensionDescriptions = [];
  const { top, bottom, left, right } = processedExtension;
  const isPureUpscale = top === 0 && bottom === 0 && left === 0 && right === 0;

  if (top > 0) extensionDescriptions.push(`${getMagnitudeDescription(top, newDims.height)} extending the scene upwards`);
  if (bottom > 0) extensionDescriptions.push(`${getMagnitudeDescription(bottom, newDims.height)} extending the scene downwards`);
  if (left > 0) extensionDescriptions.push(`${getMagnitudeDescription(left, newDims.width)} revealing more context to the left`);
  if (right > 0) extensionDescriptions.push(`${getMagnitudeDescription(right, newDims.width)} expanding the view to the right`);

  // 3. Intelligent Prompt Engineering for Detail Enhancement
  let finalPrompt = "";
  
  // Determine strictness of detail enhancement based on target resolution
  const detailInstruction = config.upscale !== '1K'
    ? `Render the result in strict ${config.upscale} resolution. Significantly enhance fine details, sharpen edges, and repair any blurry or low-quality areas in the provided image source. Improve texture realism and lighting clarity while maintaining the subject identity.`
    : `Maintain the original image style and lighting.`;

  if (isPureUpscale) {
    finalPrompt = `Upscale this image to ${config.upscale}. ${detailInstruction} Do not alter the framing or composition, but drastically improve the visual fidelity. ${config.prompt}`;
  } else {
    const directionText = `Extend the image by ${extensionDescriptions.join(' and ')}.`;
    finalPrompt = `${directionText} ${config.prompt}. ${detailInstruction} Ensure the new extended areas are high-definition and blend seamlessly with the enhanced original content.`;
  }

  // ---------------------------------------------------------
  // PATH A: SERVER-SIDE (Production Mode)
  // ---------------------------------------------------------
  const backendUrl = getBackendUrl();
  
  if (backendUrl && !userApiKey) {
    // If a backend is configured and the user didn't force a manual key, use the backend
    try {
      const response = await fetch(`${backendUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: processedImage,
          prompt: finalPrompt,
          aspectRatio: apiAspectRatio,
          upscale: config.upscale
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl; // Expecting { imageUrl: "data:image..." }
    } catch (err) {
      console.error("Backend Generation Error:", err);
      throw err;
    }
  }

  // ---------------------------------------------------------
  // PATH B: CLIENT-SIDE (Demo/Prototype Mode)
  // ---------------------------------------------------------
  
  const apiKey = userApiKey || getSystemApiKey();

  if (!apiKey) {
    throw new Error("API Key is missing. Please configure the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: finalPrompt },
          {
            inlineData: {
              mimeType: getMimeType(processedImage),
              data: stripBase64Prefix(processedImage),
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: apiAspectRatio, 
          imageSize: config.upscale,
        },
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
       for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
             return `data:image/png;base64,${part.inlineData.data}`;
          }
       }
    }

    throw new Error("No image data returned from API.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
