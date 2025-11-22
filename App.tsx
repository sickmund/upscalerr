
import React, { useState, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageViewer } from './components/ImageViewer';
import { ApiKeySelector } from './components/ApiKeySelector';
import { AppState, GenerationConfig, ViewMode, ExtensionSettings } from './types';
import { DEFAULT_PROMPT } from './constants';
import { generateExtendedImage } from './services/geminiService';

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [state, setState] = useState<AppState>({
    originalImage: null,
    imageDimensions: null,
    generatedImage: null,
    isLoading: false,
    error: null,
  });

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: DEFAULT_PROMPT,
    aspectRatio: 'Original', // Default to Original
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

  const handleResetImage = () => {
    setState({
      originalImage: null,
      imageDimensions: null,
      generatedImage: null,
      isLoading: false,
      error: null,
    });
    setConfig(prev => ({
      ...prev,
      aspectRatio: 'Original',
      extension: { top: 0, bottom: 0, left: 0, right: 0 }
    }));
    // Clear file input value to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtensionUpdate = (updates: Partial<ExtensionSettings>) => {
    setConfig(prev => ({
      ...prev,
      extension: { ...prev.extension, ...updates }
    }));
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
        const result = reader.result as string;
        
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          setState({
            originalImage: result,
            imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
            generatedImage: null,
            isLoading: false,
            error: null
          });
          // Reset extensions on new image
          setConfig(prev => ({
            ...prev,
            aspectRatio: 'Original',
            extension: { top: 0, bottom: 0, left: 0, right: 0 }
          }));
          setViewMode(ViewMode.Original);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!state.originalImage) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Pass current dimensions to config for service usage
    const finalConfig = {
      ...config,
      originalDimensions: state.imageDimensions || undefined
    };

    try {
      const generatedImage = await generateExtendedImage(state.originalImage, finalConfig);
      setState(prev => ({
        ...prev,
        generatedImage,
        isLoading: false
      }));
      setViewMode(ViewMode.Result);
    } catch (err: any) {
       if (err.message && err.message.includes("Requested entity was not found")) {
           setApiKeyReady(false); 
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
          onResetImage={handleResetImage}
          imageDimensions={state.imageDimensions}
        />
        
        <ImageViewer 
          originalImage={state.originalImage}
          imageDimensions={state.imageDimensions}
          generatedImage={state.generatedImage}
          isLoading={state.isLoading}
          error={state.error}
          config={config} 
          viewMode={viewMode}
          setViewMode={setViewMode}
          onUpdateExtension={handleExtensionUpdate}
        />
      </div>
    </div>
  );
};

export default App;
