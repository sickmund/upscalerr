import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";
import { MODEL_NAME } from "../constants";

// Helper to remove data URL prefix
const stripBase64Prefix = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

const getMimeType = (dataUrl: string) => {
  return dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
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
  
  // Check if we have any cropping (negative extensions)
  if (top >= 0 && bottom >= 0 && left >= 0 && right >= 0) {
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

  // Calculate crop amounts (positive value = amount to remove)
  const cropTop = Math.max(0, -top);
  const cropBottom = Math.max(0, -bottom);
  const cropLeft = Math.max(0, -left);
  const cropRight = Math.max(0, -right);

  // Calculate new dimensions of the base image
  const newWidth = originalDims.width - cropLeft - cropRight;
  const newHeight = originalDims.height - cropTop - cropBottom;

  if (newWidth <= 0 || newHeight <= 0) {
    throw new Error("Cropping removed the entire image");
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  // Draw the cropped portion of the original image
  // sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight
  ctx.drawImage(
    img,
    cropLeft, cropTop, newWidth, newHeight,
    0, 0, newWidth, newHeight
  );

  const processedImage = canvas.toDataURL(getMimeType(originalImageStr));

  // Return the new state. 
  // Importantly, any side that was cropped now has an extension of 0 for the AI generation step
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
  config: GenerationConfig
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const { width: originalWidth, height: originalHeight } = config.originalDimensions || { width: 1000, height: 1000 };

  // Pre-process image: Apply crops if any extensions are negative
  const { processedImage, processedExtension, newDims } = await processImageForGeneration(
    originalImage, 
    config.extension,
    { width: originalWidth, height: originalHeight }
  );

  // Calculate final dimensions for Aspect Ratio
  // Note: processedExtension only contains positive values now (extensions)
  const totalWidth = newDims.width + processedExtension.left + processedExtension.right;
  const totalHeight = newDims.height + processedExtension.top + processedExtension.bottom;
  
  const apiAspectRatio = getClosestAspectRatio(totalWidth, totalHeight);

  const extensionDescriptions = [];
  const { top, bottom, left, right } = processedExtension;
  
  // Check if we are purely upscaling/cropping (no extensions)
  const isPureCropOrUpscale = top === 0 && bottom === 0 && left === 0 && right === 0;

  if (top > 0) extensionDescriptions.push(`${getMagnitudeDescription(top, newDims.height)} extending the scene upwards`);
  if (bottom > 0) extensionDescriptions.push(`${getMagnitudeDescription(bottom, newDims.height)} extending the scene downwards`);
  if (left > 0) extensionDescriptions.push(`${getMagnitudeDescription(left, newDims.width)} revealing more context to the left`);
  if (right > 0) extensionDescriptions.push(`${getMagnitudeDescription(right, newDims.width)} expanding the view to the right`);

  let finalPrompt = "";

  if (isPureCropOrUpscale) {
    // If we are just cropping/upscaling, strictly tell the model to maintain the content
    finalPrompt = `Upscale this image to ${config.upscale} resolution. Maintain the exact composition and details of the provided image. Enhance clarity and texture fidelity. ${config.prompt}`;
  } else {
    // If we are extending
    const directionText = `Extend the image by ${extensionDescriptions.join(' and ')}.`;
    finalPrompt = `${directionText} ${config.prompt}. Ensure seamless integration with the original style, lighting, and details.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: finalPrompt,
          },
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
    throw new Error(error.message || "Failed to generate image.");
  }
};