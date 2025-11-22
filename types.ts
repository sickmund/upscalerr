export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface ExtensionSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  upscale: ImageSize;
  extension: ExtensionSettings;
}

export interface AppState {
  originalImage: string | null;
  generatedImage: string | null;
  isLoading: boolean;
  error: string | null;
}

export enum ViewMode {
  Split = 'SPLIT',
  Original = 'ORIGINAL',
  Result = 'RESULT'
}
