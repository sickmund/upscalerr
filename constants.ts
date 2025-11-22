import { AspectRatio, ImageSize } from './types';

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16'];
export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

export const MODEL_NAME = 'gemini-3-pro-image-preview'; // Required for high quality image gen/editing

export const DEFAULT_PROMPT = "A high quality, realistic extension of the scene, maintaining consistent lighting, texture, and style.";
