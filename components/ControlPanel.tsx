
import React, { useEffect, useState } from 'react';
import { Maximize, FileUp, Sparkles, Sliders, Scan, Scaling, Trash2, RotateCcw, X, Crop, Expand } from 'lucide-react';
import { GenerationConfig, ExtensionSettings, AspectRatio, ImageDimensions } from '../types';
import { ASPECT_RATIOS, IMAGE_SIZES } from '../constants';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onUploadClick: () => void;
  onResetImage: () => void;
  imageDimensions: ImageDimensions | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  setConfig,
  onGenerate,
  isGenerating,
  onUploadClick,
  onResetImage,
  imageDimensions
}) => {
  const [activeRatio, setActiveRatio] = useState<AspectRatio | 'custom'>('Original');

  const updateExtension = (key: keyof ExtensionSettings, value: number) => {
    setConfig(prev => ({
      ...prev,
      extension: { ...prev.extension, [key]: value }
    }));
    setActiveRatio('custom'); // Switch to custom if manual adjustment
  };

  const resetExtensions = () => {
    setConfig(prev => ({
      ...prev,
      extension: { top: 0, bottom: 0, left: 0, right: 0 },
      aspectRatio: 'Original'
    }));
    setActiveRatio('Original');
  };

  // Auto-calculate extensions to fit aspect ratio
  const applyAspectRatio = (ratio: AspectRatio) => {
    // Always set the config ratio
    if (!imageDimensions) {
      setConfig(prev => ({ ...prev, aspectRatio: ratio }));
      setActiveRatio(ratio);
      return;
    }

    if (ratio === 'Original') {
        resetExtensions();
        return;
    }

    const [wStr, hStr] = ratio.split(':');
    const targetRatio = parseInt(wStr) / parseInt(hStr);
    // Use Math.round for stability to prevent sub-pixel glitches
    const currentRatio = imageDimensions.width / imageDimensions.height;

    let newExt = { top: 0, bottom: 0, left: 0, right: 0 };

    // Threshold for "close enough" to avoid 1px jitter on roughly equal ratios
    if (Math.abs(currentRatio - targetRatio) > 0.01) {
        if (targetRatio > currentRatio) {
          // Needs to be wider. Add width to left/right.
          // targetWidth = height * targetRatio
          const targetWidth = imageDimensions.height * targetRatio;
          const widthDiff = Math.max(0, Math.round(targetWidth - imageDimensions.width));
          const side = Math.round(widthDiff / 2);
          newExt = { top: 0, bottom: 0, left: side, right: widthDiff - side };
        } else {
          // Needs to be taller. Add height to top/bottom.
          // targetHeight = width / targetRatio
          const targetHeight = imageDimensions.width / targetRatio;
          const heightDiff = Math.max(0, Math.round(targetHeight - imageDimensions.height));
          const side = Math.round(heightDiff / 2);
          newExt = { top: side, bottom: heightDiff - side, left: 0, right: 0 };
        }
    }

    setConfig(prev => ({
      ...prev,
      aspectRatio: ratio,
      extension: newExt
    }));
    setActiveRatio(ratio);
  };

  // When image changes, re-apply current ratio if it's not custom
  useEffect(() => {
    if (imageDimensions) {
       // Force re-evaluation of ratio on new image load
       if (activeRatio !== 'custom') {
           applyAspectRatio(activeRatio);
       }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDimensions]);

  // Detect if manual changes made extensions zero -> switch to Original visually
  useEffect(() => {
      const { top, bottom, left, right } = config.extension;
      if (activeRatio === 'custom' && top === 0 && bottom === 0 && left === 0 && right === 0) {
          setActiveRatio('Original');
          setConfig(prev => ({ ...prev, aspectRatio: 'Original' }));
      }
  }, [config.extension, activeRatio, setConfig]);

  const maxPixelRange = imageDimensions ? Math.max(imageDimensions.width, imageDimensions.height) : 1000;
  const hasChanges = activeRatio !== 'Original' || Object.values(config.extension).some(v => v !== 0);

  return (
    <div className="w-full lg:w-80 bg-gray-900 border-r border-gray-800 h-full flex flex-col overflow-y-auto scrollbar-hide">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Maximize className="w-6 h-6 text-brand-500" />
          VistaExpand
        </h1>
        <p className="text-xs text-gray-500 mt-1">Pixel-Perfect Outpainting</p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        
        {/* Upload Action */}
        <div className="flex gap-2">
           <button
            onClick={onUploadClick}
            className="flex-1 py-4 border-2 border-dashed border-gray-700 hover:border-brand-500 hover:bg-gray-800/50 rounded-xl text-gray-400 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
           >
             <FileUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
             <span className="text-sm font-medium">
                {imageDimensions ? 'Change Image' : 'Upload Source'}
             </span>
             {imageDimensions && (
               <span className="text-xs text-gray-600 font-mono bg-gray-900 px-2 py-0.5 rounded">
                 {imageDimensions.width} x {imageDimensions.height}px
               </span>
             )}
           </button>
           
           {imageDimensions && (
             <button 
               onClick={onResetImage}
               className="w-12 border-2 border-dashed border-gray-800 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors"
               title="Clear Image"
             >
               <Trash2 className="w-5 h-5" />
             </button>
           )}
        </div>

        {/* Aspect Ratio Control */}
        <div className="space-y-3">
           <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Scan className="w-4 h-4" /> Target Frame
                </h3>
                {hasChanges && (
                    <button 
                        onClick={resetExtensions}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded text-xs transition-colors animate-in fade-in"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset Changes
                    </button>
                )}
           </div>

           <div className="grid grid-cols-3 gap-2">
               <button
                  onClick={() => applyAspectRatio('Original')}
                  className={`text-xs py-2 rounded-lg border transition-all ${
                    activeRatio === 'Original'
                      ? 'bg-brand-500/20 border-brand-500 text-brand-200 font-bold' 
                      : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Original
                </button>
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r}
                  onClick={() => applyAspectRatio(r)}
                  className={`text-xs py-2 rounded-lg border transition-all ${
                    activeRatio === r
                      ? 'bg-brand-500/20 border-brand-500 text-brand-200 font-bold' 
                      : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
           </div>
           <p className="text-[10px] text-gray-500 leading-tight">
              Select a preset or drag sliders. Use 'Reset Changes' to return to the original photo.
           </p>
        </div>

        {/* Manual Sliders */}
        <div className={`space-y-4 transition-opacity ${!imageDimensions ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
               <Sliders className="w-4 h-4" /> Manual Adjustment
             </h3>
          </div>
          
          {[
            { label: 'Top', key: 'top' as const, dim: imageDimensions?.height || 1000 },
            { label: 'Bottom', key: 'bottom' as const, dim: imageDimensions?.height || 1000 },
            { label: 'Left', key: 'left' as const, dim: imageDimensions?.width || 1000 },
            { label: 'Right', key: 'right' as const, dim: imageDimensions?.width || 1000 },
          ].map(({ label, key, dim }) => {
            const val = config.extension[key];
            const isCrop = val < 0;
            // Limit crop so we don't disappear the image. Leave at least 100px.
            const minVal = -(dim - 100); 

            return (
              <div key={key} className="space-y-1 group">
                <div className="flex justify-between text-xs text-gray-400 items-center">
                  <span className="flex items-center gap-1.5">
                     {label}
                     {val !== 0 && (
                       <span className={`text-[9px] px-1 rounded ${isCrop ? 'bg-red-500/20 text-red-300' : 'bg-brand-500/20 text-brand-300'}`}>
                         {isCrop ? 'CROP' : 'EXTEND'}
                       </span>
                     )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${val === 0 ? 'text-gray-600' : isCrop ? 'text-red-400' : 'text-brand-400'}`}>
                      {val > 0 ? '+' : ''}{val} px
                    </span>
                    {val !== 0 && (
                      <button 
                        onClick={() => updateExtension(key, 0)}
                        className="text-gray-600 hover:text-white p-0.5 rounded hover:bg-gray-800 transition-colors"
                        title="Reset to 0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 h-4 flex items-center">
                        <div className="absolute left-0 right-0 h-1.5 bg-gray-700 rounded-lg overflow-hidden">
                            {/* Center tick */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-600 z-0"></div>
                        </div>
                        <input
                          type="range"
                          min={minVal}
                          max={maxPixelRange}
                          step="8"
                          value={val}
                          onChange={(e) => updateExtension(key, parseInt(e.target.value))}
                          className={`relative z-10 w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer focus:outline-none 
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                            ${isCrop 
                                ? '[&::-webkit-slider-thumb]:bg-red-500 hover:[&::-webkit-slider-thumb]:bg-red-400' 
                                : '[&::-webkit-slider-thumb]:bg-brand-500 hover:[&::-webkit-slider-thumb]:bg-brand-400'
                            }
                            ${val === 0 ? '[&::-webkit-slider-thumb]:bg-gray-500' : ''}
                          `}
                        />
                    </div>
                    {isCrop ? <Crop className="w-3 h-3 text-red-500" /> : <Expand className="w-3 h-3 text-brand-500" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upscaling */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Scaling className="w-4 h-4" /> Upscaling
            </h3>
            <div className="h-px flex-1 bg-gray-800 mx-3"></div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1 border border-gray-800">
             {IMAGE_SIZES.map(size => (
               <button
                 key={size}
                 onClick={() => setConfig(prev => ({ ...prev, upscale: size }))}
                 className={`flex-1 py-2 text-xs rounded-lg font-medium transition-all ${
                   config.upscale === size
                     ? 'bg-brand-600 text-white shadow-lg'
                     : 'text-gray-400 hover:text-white hover:bg-gray-700'
                 }`}
               >
                 {size}
               </button>
             ))}
          </div>
          <p className="text-[10px] text-gray-500">
            Output resolution: {config.upscale}.
          </p>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2 pt-4 border-t border-gray-800">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Prompt</label>
          <textarea
            value={config.prompt}
            onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
            placeholder="Describe the scene extension..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3 h-20 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none placeholder-gray-600"
          />
        </div>

      </div>

      {/* Action Button */}
      <div className="p-6 border-t border-gray-800 bg-gray-900 z-10">
        <button
          onClick={onGenerate}
          disabled={!imageDimensions || isGenerating}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
            !imageDimensions || isGenerating
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-brand-500/20 active:scale-[0.98]'
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
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
};
