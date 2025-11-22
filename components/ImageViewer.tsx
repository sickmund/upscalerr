import React, { useState, useEffect } from 'react';
import { ViewMode, ExtensionSettings } from '../types';
import { Download, AlertCircle, ZoomIn, Columns, Layout } from 'lucide-react';

interface ImageViewerProps {
  originalImage: string | null;
  generatedImage: string | null;
  isLoading: boolean;
  error: string | null;
  extension: ExtensionSettings;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalImage,
  generatedImage,
  isLoading,
  error,
  extension,
  viewMode,
  setViewMode
}) => {
  
  // Checkerboard pattern for extension areas
  const patternStyle = {
    backgroundImage: `
      linear-gradient(45deg, #1f2937 25%, transparent 25%), 
      linear-gradient(-45deg, #1f2937 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, #1f2937 75%), 
      linear-gradient(-45deg, transparent 75%, #1f2937 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: '#111827'
  };

  if (!originalImage && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 p-8 text-center">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
           <Layout className="w-10 h-10 text-gray-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Upload an Image to Start</h2>
        <p className="text-gray-500 max-w-md">
          Expand your visuals in any direction. Use the controls on the left to configure your extension and upscaling options.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 relative overflow-hidden">
      
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-1 shadow-xl">
        <button
          onClick={() => setViewMode(ViewMode.Original)}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.Original ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          title="Show Editor"
        >
          <span className="text-xs font-bold">Editor</span>
        </button>
        <button
          onClick={() => setViewMode(ViewMode.Split)}
          disabled={!generatedImage}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.Split ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} ${!generatedImage ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Split View"
        >
          <Columns className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode(ViewMode.Result)}
          disabled={!generatedImage}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.Result ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'} ${!generatedImage ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Show Result"
        >
          <span className="text-xs font-bold">Result</span>
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-8 overflow-auto bg-gray-950">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center fixed">
             <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-800 border-t-brand-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <ZoomIn className="w-8 h-8 text-brand-500 animate-pulse" />
                </div>
             </div>
             <h3 className="mt-6 text-xl font-medium text-white">Extending Reality...</h3>
             <p className="text-gray-400 mt-2 text-sm">Expanding your canvas and generating details...</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl max-w-lg fixed">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Image Display Logic */}
        <div className="relative min-w-0 min-h-0 flex items-center justify-center">
          
          {/* Case 1: Editor Mode (Original + Extensions) */}
          {(!generatedImage || viewMode === ViewMode.Original) && originalImage && (
             <div 
                className="relative shadow-2xl transition-all duration-300"
                style={{
                   display: 'inline-grid',
                   // The grid tracks use 'fr' units. 
                   // The center track (original image) is fixed at 100fr.
                   // The side tracks scale proportionally based on slider values (0-100).
                   // This ensures the visualization matches the extension percentage relative to the image size.
                   gridTemplateColumns: `${extension.left}fr 100fr ${extension.right}fr`,
                   gridTemplateRows: `${extension.top}fr 100fr ${extension.bottom}fr`,
                   maxWidth: '100%', 
                }}
             >
                {/* Top Row */}
                <div style={extension.top > 0 && extension.left > 0 ? patternStyle : {}} className="opacity-50 rounded-tl-lg"></div>
                <div style={extension.top > 0 ? patternStyle : {}} className="opacity-50 relative border-b border-brand-500/30 flex items-center justify-center">
                   {extension.top > 0 && <span className="text-[10px] text-brand-300 font-mono bg-gray-900/80 px-1 rounded">{extension.top}%</span>}
                </div>
                <div style={extension.top > 0 && extension.right > 0 ? patternStyle : {}} className="opacity-50 rounded-tr-lg"></div>

                {/* Middle Row */}
                <div style={extension.left > 0 ? patternStyle : {}} className="opacity-50 border-r border-brand-500/30 flex items-center justify-center">
                   {extension.left > 0 && <span className="text-[10px] text-brand-300 font-mono bg-gray-900/80 px-1 rounded -rotate-90">{extension.left}%</span>}
                </div>
                
                {/* Original Image (Center) */}
                <div className="relative bg-gray-900 z-10">
                   <img 
                     src={originalImage} 
                     alt="Original" 
                     className="block max-h-[60vh] w-auto max-w-full object-contain border border-gray-700"
                     style={{ maxWidth: '100%', maxHeight: '60vh' }}
                   />
                </div>

                <div style={extension.right > 0 ? patternStyle : {}} className="opacity-50 border-l border-brand-500/30 flex items-center justify-center">
                   {extension.right > 0 && <span className="text-[10px] text-brand-300 font-mono bg-gray-900/80 px-1 rounded rotate-90">{extension.right}%</span>}
                </div>

                {/* Bottom Row */}
                <div style={extension.bottom > 0 && extension.left > 0 ? patternStyle : {}} className="opacity-50 rounded-bl-lg"></div>
                <div style={extension.bottom > 0 ? patternStyle : {}} className="opacity-50 border-t border-brand-500/30 flex items-center justify-center">
                   {extension.bottom > 0 && <span className="text-[10px] text-brand-300 font-mono bg-gray-900/80 px-1 rounded">{extension.bottom}%</span>}
                </div>
                <div style={extension.bottom > 0 && extension.right > 0 ? patternStyle : {}} className="opacity-50 rounded-br-lg"></div>

                {/* Overlay border for the whole extended area */}
                <div className="absolute inset-0 border-2 border-brand-500/20 pointer-events-none rounded-lg ring-1 ring-gray-900/50"></div>
             </div>
          )}

          {/* Case 2: Result Mode */}
          {generatedImage && viewMode === ViewMode.Result && (
             <div className="relative shadow-2xl">
               <img 
                 src={generatedImage} 
                 alt="Generated" 
                 className="max-h-[85vh] max-w-full object-contain rounded-lg border border-gray-800"
               />
               <a 
                 href={generatedImage} 
                 download="vista-expand-result.png"
                 className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur transition-all hover:scale-110"
               >
                 <Download className="w-5 h-5" />
               </a>
             </div>
          )}

          {/* Case 3: Split Mode */}
          {generatedImage && viewMode === ViewMode.Split && originalImage && (
            <div className="flex items-center gap-6 w-full h-full justify-center max-w-7xl">
               <div className="flex-1 flex flex-col items-center h-full justify-center">
                  <span className="mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-900 px-3 py-1 rounded-full">Original</span>
                  <img src={originalImage} className="max-h-[75vh] max-w-full object-contain rounded-lg border border-gray-800 opacity-90" />
               </div>
               <div className="flex-1 flex flex-col items-center h-full justify-center">
                  <span className="mb-3 text-xs font-bold text-brand-400 uppercase tracking-wider bg-brand-900/20 px-3 py-1 rounded-full border border-brand-500/20">Extended Result</span>
                  <img src={generatedImage} className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl shadow-brand-900/20 border border-brand-500/30" />
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};