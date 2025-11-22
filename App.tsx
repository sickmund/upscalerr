import React, { useState, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageViewer } from './components/ImageViewer';
import { ApiKeySelector } from './components/ApiKeySelector';
import { AppState, GenerationConfig, ViewMode } from './types';
import { DEFAULT_PROMPT } from './constants';
import { generateExtendedImage } from './services/geminiService';

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [state, setState] = useState<AppState>({
    originalImage: null,
    generatedImage: null,
    isLoading: false,
    error: null,
  });

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: DEFAULT_PROMPT,
    aspectRatio: '16:9',
    upscale: '2K',
    extension: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Original);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setState(prev => ({ ...prev, error: "Image size too large. Please use images under 5MB." }));
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setState({
          originalImage: reader.result as string,
          generatedImage: null,
          isLoading: false,
          error: null
        });
        setViewMode(ViewMode.Original);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!state.originalImage) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const generatedImage = await generateExtendedImage(state.originalImage, config);
      setState(prev => ({
        ...prev,
        generatedImage,
        isLoading: false
      }));
      setViewMode(ViewMode.Result);
    } catch (err: any) {
       // If specifically resource not found, it might be key related, but usually error message is generic
       // If requested entity was not found, we might need to prompt for key again.
       if (err.message && err.message.includes("Requested entity was not found")) {
           setApiKeyReady(false); // Trigger key selector again
           setState(prev => ({ ...prev, isLoading: false, error: "API Key session expired or invalid. Please select key again." }));
       } else {
           setState(prev => ({
             ...prev,
             isLoading: false,
             error: err.message || "An unexpected error occurred during generation."
           }));
       }
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans">
      <ApiKeySelector onKeySelected={() => setApiKeyReady(true)} />
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Main Layout */}
      <div className={`flex w-full h-full transition-opacity duration-500 ${apiKeyReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ControlPanel 
          config={config} 
          setConfig={setConfig} 
          onGenerate={handleGenerate}
          isGenerating={state.isLoading}
          onUploadClick={handleUploadClick}
          hasImage={!!state.originalImage}
        />
        
        <ImageViewer 
          originalImage={state.originalImage}
          generatedImage={state.generatedImage}
          isLoading={state.isLoading}
          error={state.error}
          extension={config.extension}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>
    </div>
  );
};

export default App;