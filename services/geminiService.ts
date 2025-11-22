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

// Helper to generate descriptive text based on percentage
const getMagnitudeDescription = (value: number) => {
  if (value <= 0) return "";
  if (value < 15) return "slightly";
  if (value < 40) return "moderately";
  if (value < 70) return "significantly";
  return "massively";
};

export const generateExtendedImage = async (
  originalImage: string,
  config: GenerationConfig
): Promise<string> => {
  // Always create a new instance to ensure we have the latest key if re-selected
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct a descriptive prompt based on sliders
  // We guide the model via prompt engineering to understand the desired expansion.
  const { top, bottom, left, right } = config.extension;
  const extensionDescriptions = [];
  
  if (top > 0) extensionDescriptions.push(`${getMagnitudeDescription(top)} extending the scene upwards`);
  if (bottom > 0) extensionDescriptions.push(`${getMagnitudeDescription(bottom)} extending the scene downwards`);
  if (left > 0) extensionDescriptions.push(`${getMagnitudeDescription(left)} revealing more context to the left`);
  if (right > 0) extensionDescriptions.push(`${getMagnitudeDescription(right)} expanding the view to the right`);

  const directionText = extensionDescriptions.length > 0 
    ? `Extend the image by ${extensionDescriptions.join(' and ')}.`
    : "Extend the image boundaries naturally.";

  const finalPrompt = `${directionText} ${config.prompt}. Ensure seamless integration with the original style, lighting, and details.`;

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
              mimeType: getMimeType(originalImage),
              data: stripBase64Prefix(originalImage),
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
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