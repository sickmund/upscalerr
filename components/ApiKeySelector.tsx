import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Loader2 } from 'lucide-react';

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  const getAiStudio = (): AIStudio | undefined => {
    return (window as any).aistudio;
  };

  const checkKey = async () => {
    setChecking(true);
    const aistudio = getAiStudio();
    if (aistudio?.hasSelectedApiKey) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
      if (selected) {
        onKeySelected();
      }
    }
    setChecking(false);
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    const aistudio = getAiStudio();
    if (aistudio?.openSelectKey) {
        try {
            await aistudio.openSelectKey();
            // Assume success after dialog closes (standard pattern for this API)
            // Re-check just in case
            await checkKey();
            // Force proceed even if check is slightly delayed
            onKeySelected(); 
        } catch (e) {
            console.error("Error selecting key", e);
        }
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center p-4 text-brand-400">
        <Loader2 className="animate-spin h-5 w-5 mr-2" />
        <span>Verifying API Access...</span>
      </div>
    );
  }

  if (hasKey) {
    return null; // Already handled
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="mx-auto bg-brand-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Key className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">API Key Required</h2>
        <p className="text-gray-400 mb-6">
          To use the high-quality image extension features (Gemini 3 Pro), you need to select a paid API key from a Google Cloud Project.
        </p>
        
        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          Select API Key
        </button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 transition-colors"
        >
          Learn about billing requirements <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};