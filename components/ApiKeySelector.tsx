
import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, Check, X } from 'lucide-react';

interface ApiKeySelectorProps {
  onApiKeySubmit: (key: string) => void;
  currentKey?: string;
  onClose?: () => void; // Make optional
  isErrorMode?: boolean; // New prop to indicate we are showing this because of an error
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onApiKeySubmit, currentKey, onClose, isErrorMode }) => {
  const [key, setKey] = useState('');
  
  useEffect(() => {
    if (currentKey) setKey(currentKey);
  }, [currentKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length > 0) {
      onApiKeySubmit(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isErrorMode ? 'bg-red-500/20' : 'bg-brand-500/20'}`}>
               {isErrorMode ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <Key className="w-5 h-5 text-brand-400" />}
             </div>
             <div>
               <h2 className="text-lg font-bold text-white">
                 {isErrorMode ? 'Authentication Failed' : 'API Configuration'}
               </h2>
               <p className="text-xs text-gray-400">
                 {isErrorMode ? 'System API Key invalid or missing' : 'Enter your Gemini API Key'}
               </p>
             </div>
          </div>
          {onClose && !isErrorMode && (
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isErrorMode && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
              The application could not connect using the configured environment variable. Please enter your API key manually to proceed.
            </div>
          )}
          
          <p className="text-sm text-gray-400 leading-relaxed">
            Your API key is stored locally in your browser and is never sent to any server other than Google's Gemini API.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">
                Gemini API Key
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={key.length < 10}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isErrorMode ? 'Retry Connection' : 'Save API Key'}
            </button>
          </form>
          
          <div className="pt-4 border-t border-gray-800 flex justify-center">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300 hover:underline">
               Get a Gemini API Key
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};
