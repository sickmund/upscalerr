import React from 'react';
import { Settings, Maximize, FileUp, Sparkles, Image as ImageIcon, Sliders } from 'lucide-react';
import { GenerationConfig, ExtensionSettings, AspectRatio, ImageSize } from '../types';
import { ASPECT_RATIOS, IMAGE_SIZES } from '../constants';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onUploadClick: () => void;
  hasImage: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  setConfig,
  onGenerate,
  isGenerating,
  onUploadClick,
  hasImage
}) => {
  const updateExtension = (key: keyof ExtensionSettings, value: number) => {
    setConfig(prev => ({
      ...prev,
      extension: { ...prev.extension, [key]: value }
    }));
  };

  return (
    <div className="w-full lg:w-80 bg-gray-900 border-r border-gray-800 h-full flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Maximize className="w-6 h-6 text-brand-500" />
          VistaExpand
        </h1>
        <p className="text-xs text-gray-500 mt-1">AI-Powered Outpainting</p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        
        {/* Upload Action */}
        <div>
           <button
            onClick={onUploadClick}
            className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-brand-500 hover:bg-gray-800/50 rounded-xl text-gray-400 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group"
           >
             <FileUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
             <span className="text-sm font-medium">
                {hasImage ? 'Replace Image' : 'Upload Image'}
             </span>
           </button>
        </div>

        {/* Direction Sliders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
               <Sliders className="w-4 h-4" /> Extension
             </h3>
             <button 
                onClick={() => setConfig(prev => ({...prev, extension: { top: 0, bottom: 0, left: 0, right: 0 }}))}
                className="text-xs text-brand-400 hover:text-brand-300"
             >
                Reset
             </button>
          </div>
          
          {[
            { label: 'Top', key: 'top' as const },
            { label: 'Bottom', key: 'bottom' as const },
            { label: 'Left', key: 'left' as const },
            { label: 'Right', key: 'right' as const },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{label}</span>
                <span>{config.extension[key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.extension[key]}
                onChange={(e) => updateExtension(key, parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400"
              />
            </div>
          ))}
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-xs text-gray-500">Aspect Ratio</label>
               <select 
                 value={config.aspectRatio}
                 onChange={(e) => setConfig(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
                 className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
               >
                 {ASPECT_RATIOS.map(r => (
                   <option key={r} value={r}>{r}</option>
                 ))}
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-xs text-gray-500">Upscale</label>
               <select 
                 value={config.upscale}
                 onChange={(e) => setConfig(prev => ({ ...prev, upscale: e.target.value as ImageSize }))}
                 className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
               >
                 {IMAGE_SIZES.map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 font-medium">Prompt Adjustment (Optional)</label>
          <textarea
            value={config.prompt}
            onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
            placeholder="Describe specifically what to fill in the extended areas..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3 h-24 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none placeholder-gray-600"
          />
        </div>

      </div>

      {/* Action Button */}
      <div className="p-6 border-t border-gray-800 bg-gray-900 z-10">
        <button
          onClick={onGenerate}
          disabled={!hasImage || isGenerating}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
            !hasImage || isGenerating
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20 active:scale-[0.98]'
          }`}
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Extension
            </>
          )}
        </button>
      </div>
    </div>
  );
};
