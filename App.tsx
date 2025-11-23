import React, { useState, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ImageViewer } from './components/ImageViewer';
import { ApiKeySelector } from './components/ApiKeySelector';
import { MockPaymentModal } from './components/MockPaymentModal';
import { AppState, GenerationConfig, ViewMode, ExtensionSettings } from './types';
import { DEFAULT_PROMPT } from './constants';
import { generateExtendedImage } from './services/geminiService';
import { Key } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    imageDimensions: null,
    generatedImage: null,
    isLoading: false,
    error: null,
    apiKey: localStorage.getItem('gemini_api_key') || undefined
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: DEFAULT_PROMPT,
    aspectRatio: 'Original',
    upscale: '2K', // Default to 2K (Paid) to show off the feature
    extension: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Original);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApiKeySubmit = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setState(prev => ({ ...prev, apiKey: key, error: null }));
    setShowApiKeyModal(false);
    setIsAuthError(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleResetImage = () => {
    setState(prev => ({
      ...prev,
      originalImage: null,
      imageDimensions: null,
      generatedImage: null,
      isLoading: false,
      error: null,
    }));
    setConfig(prev => ({
      ...prev,
      aspectRatio: 'Original',
      extension: { top: 0, bottom: 0, left: 0, right: 0 }
    }));
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
        const img = new Image();
        img.onload = () => {
          setState(prev => ({
            ...prev,
            originalImage: result,
            imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
            generatedImage: null,
            isLoading: false,
            error: null
          }));
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

  // The Logic: Intercepts the button click.
  // If 1K -> Go straight to generation.
  // If 2K/4K -> Open Payment Modal first.
  const handleGenerateRequest = () => {
    if (config.upscale === '1K') {
      performGeneration();
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentComplete = () => {
    setShowPaymentModal(false);
    performGeneration();
  };

  const performGeneration = async () => {
    if (!state.originalImage) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const finalConfig = {
      ...config,
      originalDimensions: state.imageDimensions || undefined
    };

    try {
      // Pass state.apiKey if it exists (manual override), otherwise service uses env var
      const generatedImage = await generateExtendedImage(state.originalImage, finalConfig, state.apiKey);
      
      setState(prev => ({
        ...prev,
        generatedImage,
        isLoading: false
      }));
      setViewMode(ViewMode.Result);
    } catch (err: any) {
       const errorMessage = err.message || "";
       console.error("Generation Error:", err);
       
       // Check for Auth/Key errors
       if (errorMessage.includes("400") || errorMessage.includes("403") || errorMessage.includes("API key")) {
           setState(prev => ({ 
               ...prev, 
               isLoading: false, 
               error: "Authentication Failed" 
           }));
           setIsAuthError(true);
           setShowApiKeyModal(true);
       } else {
           setState(prev => ({
             ...prev,
             isLoading: false,
             error: errorMessage || "An unexpected error occurred during generation."
           }));
       }
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans relative">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Manual API Key Trigger (Hidden unless needed, or accessed via top corner) */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => setShowApiKeyModal(true)}
          className="bg-gray-900/50 hover:bg-gray-800 text-gray-500 hover:text-brand-400 p-2 rounded-full transition-colors backdrop-blur-sm border border-transparent hover:border-gray-700"
          title="Configure API Key"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      {showApiKeyModal && (
        <ApiKeySelector 
          onApiKeySubmit={handleApiKeySubmit} 
          currentKey={state.apiKey}
          onClose={() => { setShowApiKeyModal(false); setIsAuthError(false); }}
          isErrorMode={isAuthError}
        />
      )}

      {showPaymentModal && (
        <MockPaymentModal 
          amount="$0.99"
          item={`High-Fidelity ${config.upscale} Upscale`}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Main Layout */}
      <div className="flex w-full h-full">
        <ControlPanel 
          config={config} 
          setConfig={setConfig} 
          onGenerate={handleGenerateRequest}
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