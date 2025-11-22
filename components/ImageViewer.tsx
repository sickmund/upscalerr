
import React, { useRef, useState, useEffect } from 'react';
import { ViewMode, ImageViewerProps } from '../types';
import { Download, AlertCircle, ZoomIn, Columns, Layout, MousePointer2 } from 'lucide-react';

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalImage,
  imageDimensions,
  generatedImage,
  isLoading,
  error,
  config,
  viewMode,
  setViewMode,
  onUpdateExtension
}) => {
  
  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    side: 'top' | 'bottom' | 'left' | 'right';
    startPos: number;
    startVal: number;
    scale: number; // DOM pixels to Image pixels
  } | null>(null);
  
  // Reference to the container that holds the "Total Image" (Original + Extensions)
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Generate filename with metadata
  const getFilename = () => {
    const ar = config.aspectRatio.replace(':', '-');
    const scale = config.upscale;
    const date = new Date().toISOString().slice(0, 10);
    return `vista-expand-${ar}-${scale}-${date}.png`;
  };

  const handleDragStart = (e: React.MouseEvent, side: 'top' | 'bottom' | 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current || !imageDimensions) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate current Total Dimensions including current extensions
    const currentTotalWidth = imageDimensions.width + config.extension.left + config.extension.right;
    // The rect.width corresponds to currentTotalWidth
    const scale = rect.width / currentTotalWidth; // Pixels on Screen / Pixels in Image Space

    dragRef.current = {
      side,
      startPos: side === 'top' || side === 'bottom' ? e.clientY : e.clientX,
      startVal: config.extension[side],
      scale
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !imageDimensions) return;
      
      const { side, startPos, startVal, scale } = dragRef.current;
      const currentPos = side === 'top' || side === 'bottom' ? e.clientY : e.clientX;
      const deltaScreen = currentPos - startPos;
      
      // Determine pixel change based on direction
      let deltaExtension = 0;
      if (side === 'top') deltaExtension = -deltaScreen; // Drag Up = Increase Top (Extension), Drag Down = Decrease (Crop)
      else if (side === 'bottom') deltaExtension = deltaScreen; // Drag Down = Increase Bottom
      else if (side === 'left') deltaExtension = -deltaScreen; // Drag Left = Increase Left
      else if (side === 'right') deltaExtension = deltaScreen; // Drag Right = Increase Right
      
      // Convert screen pixels to image pixels
      const pixelChange = Math.round(deltaExtension / scale);
      
      // Proposed new extension value
      const newValue = startVal + pixelChange;
      
      // SAFETY CONSTRAINT: Ensure we don't crop the image into oblivion.
      // Maintain at least 100px of width/height.
      const minSize = 100;
      let constrainedValue = newValue;
      
      if (side === 'left') {
          // New width = W + right + newLeft. Must be >= minSize.
          // newLeft >= minSize - W - right
          const minLeft = minSize - imageDimensions.width - config.extension.right;
          constrainedValue = Math.max(minLeft, newValue);
      } else if (side === 'right') {
          const minRight = minSize - imageDimensions.width - config.extension.left;
          constrainedValue = Math.max(minRight, newValue);
      } else if (side === 'top') {
          const minTop = minSize - imageDimensions.height - config.extension.bottom;
          constrainedValue = Math.max(minTop, newValue);
      } else if (side === 'bottom') {
          const minBottom = minSize - imageDimensions.height - config.extension.top;
          constrainedValue = Math.max(minBottom, newValue);
      }

      onUpdateExtension({ [side]: constrainedValue });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onUpdateExtension, imageDimensions, config.extension]);


  if (!originalImage && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 p-8 text-center">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
           <Layout className="w-10 h-10 text-gray-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Upload Source Image</h2>
        <p className="text-gray-500 max-w-md">
          Start by uploading an image. Drag borders outwards to extend, or inwards to crop.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full bg-gray-950 relative overflow-hidden ${isDragging ? 'cursor-grabbing select-none' : ''}`}>
      
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
      <div className="flex-1 relative flex items-center justify-center p-12 overflow-auto bg-gray-950">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center fixed">
             <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-800 border-t-brand-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <ZoomIn className="w-8 h-8 text-brand-500 animate-pulse" />
                </div>
             </div>
             <h3 className="mt-6 text-xl font-medium text-white">Generating...</h3>
             <p className="text-gray-400 mt-2 text-sm">Processing edits and upscaling...</p>
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
        <div className="relative min-w-0 min-h-0 flex items-center justify-center w-full h-full">
          
          {/* Case 1: Editor Mode (Original + Extensions + Crops) */}
          {(!generatedImage || viewMode === ViewMode.Original) && originalImage && imageDimensions && (
             <div 
                ref={containerRef}
                className="relative shadow-2xl group/canvas ring-1 ring-gray-800 overflow-hidden"
                style={{
                   // Aspect ratio based on Total Dimensions (Original + Extensions/Crops)
                   aspectRatio: `${imageDimensions.width + config.extension.left + config.extension.right} / ${imageDimensions.height + config.extension.top + config.extension.bottom}`,
                   height: '100%',
                   maxHeight: '80vh',
                   width: 'auto',
                   maxWidth: '100%',
                   // Checkerboard background for extended areas
                   ...patternStyle,
                   backgroundRepeat: 'repeat' 
                }}
             >
                {/* Calculations for Inner Image Positioning */}
                {(() => {
                    const totalW = imageDimensions.width + config.extension.left + config.extension.right;
                    const totalH = imageDimensions.height + config.extension.top + config.extension.bottom;
                    
                    // Percentages relative to container. 
                    // Note: If cropping (e.g., left is negative), totalW is smaller than imageDimensions.width.
                    // widthPct will be > 100%, and leftPct will be negative.
                    const widthPct = (imageDimensions.width / totalW) * 100;
                    const heightPct = (imageDimensions.height / totalH) * 100;
                    const leftPct = (config.extension.left / totalW) * 100;
                    const topPct = (config.extension.top / totalH) * 100;

                    return (
                        <>
                            {/* The Image itself */}
                            <div 
                                className="absolute bg-gray-900 shadow-lg"
                                style={{
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: `${widthPct}%`,
                                    height: `${heightPct}%`,
                                    maxWidth: 'none', // Allow image to exceed container if cropped
                                    maxHeight: 'none'
                                }}
                            >
                                <img 
                                    src={originalImage} 
                                    alt="Original" 
                                    className="w-full h-full object-fill block" 
                                    draggable={false}
                                />
                            </div>
                            
                            {/* Border Highlight */}
                            <div className="absolute inset-0 border-2 border-brand-500/30 pointer-events-none transition-colors group-hover/canvas:border-brand-500/50 z-10"></div>

                            {/* Drag Handles - Positioned on Container Edges */}
                            
                            {/* Top Handle */}
                            <div 
                                className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group-hover/canvas:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleDragStart(e, 'top')}
                            >
                                <div className={`w-16 h-1 rounded-full shadow-sm backdrop-blur-sm transition-colors ${config.extension.top < 0 ? 'bg-red-500' : 'bg-brand-500'}`} />
                            </div>

                            {/* Bottom Handle */}
                            <div 
                                className="absolute -bottom-3 left-0 right-0 h-6 cursor-ns-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group-hover/canvas:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleDragStart(e, 'bottom')}
                            >
                                <div className={`w-16 h-1 rounded-full shadow-sm backdrop-blur-sm transition-colors ${config.extension.bottom < 0 ? 'bg-red-500' : 'bg-brand-500'}`} />
                            </div>

                            {/* Left Handle */}
                            <div 
                                className="absolute top-0 -left-3 bottom-0 w-6 cursor-ew-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group-hover/canvas:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleDragStart(e, 'left')}
                            >
                                <div className={`h-16 w-1 rounded-full shadow-sm backdrop-blur-sm transition-colors ${config.extension.left < 0 ? 'bg-red-500' : 'bg-brand-500'}`} />
                            </div>

                            {/* Right Handle */}
                            <div 
                                className="absolute top-0 -right-3 bottom-0 w-6 cursor-ew-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group-hover/canvas:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleDragStart(e, 'right')}
                            >
                                <div className={`h-16 w-1 rounded-full shadow-sm backdrop-blur-sm transition-colors ${config.extension.right < 0 ? 'bg-red-500' : 'bg-brand-500'}`} />
                            </div>
                        </>
                    );
                })()}
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
                 download={getFilename()}
                 className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur transition-all hover:scale-110 group"
                 title="Download Result"
               >
                 <Download className="w-5 h-5 group-hover:text-brand-400" />
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
