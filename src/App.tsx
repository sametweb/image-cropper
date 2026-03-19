/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Crop, 
  UploadCloud, 
  ArrowLeft, 
  Ruler, 
  Link as LinkIcon, 
  Layers, 
  CheckCircle, 
  RotateCcw, 
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'upload' | 'crop' | 'export';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function App() {
  const [step, setStep] = useState<Step>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 400, height: 300 });
  const [aspectLocked, setAspectLocked] = useState(true);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle File Upload
  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
          // Initialize crop area to a centered rectangle
          const initialWidth = Math.min(img.width * 0.8, 800);
          const initialHeight = Math.min(img.height * 0.8, 600);
          setCropArea({
            x: (img.width - initialWidth) / 2,
            y: (img.height - initialHeight) / 2,
            width: initialWidth,
            height: initialHeight
          });
          setStep('crop');
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  // Render Crop to Canvas
  const renderCrop = useCallback(() => {
    if (!image || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      setCroppedImage(canvas.toDataURL('image/png'));
      setStep('export');
    };
    img.src = image;
  }, [image, cropArea]);

  const reset = () => {
    setImage(null);
    setCroppedImage(null);
    setStep('upload');
  };

  // --- UI Components ---

  const Header = () => (
    <header className="flex items-center justify-between border-b border-border-dark px-6 py-3 bg-surface z-10 shrink-0">
      <div className="flex items-center gap-4">
        {step !== 'upload' && (
          <button 
            onClick={() => setStep(step === 'export' ? 'crop' : 'upload')}
            className="p-2 rounded hover:bg-border-dark transition-colors text-primary"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <Crop size={24} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Studio Cropper</h1>
        </div>
      </div>
      <div className="text-[10px] font-mono text-text-muted tracking-widest uppercase">
        {step === 'crop' ? 'Active Cropper' : step === 'export' ? 'Export Preview' : 'Local Processing Only'}
      </div>
    </header>
  );

  const AdSlot = ({ type }: { type: 'square' | 'leaderboard' }) => (
    <div className={`flex flex-col items-center justify-center p-6 ${type === 'leaderboard' ? 'w-full' : ''}`}>
      <span className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-2">Sponsored</span>
      <div className={`bg-background-dark border border-border-dark rounded-sm flex flex-col items-center justify-center relative overflow-hidden group ${type === 'square' ? 'w-[300px] h-[250px]' : 'w-full max-w-[728px] h-[90px]'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-30"></div>
        <Layers className="text-primary/20 mb-2" size={type === 'square' ? 48 : 24} />
        <p className="text-[10px] font-mono text-text-muted">ADVERTISEMENT BLOCK</p>
        <p className="text-[8px] font-mono text-text-muted/50 mt-1">{type === 'square' ? '300 x 250' : '728 x 90'}</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-dark text-text-main font-sans">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.section 
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 p-8 flex flex-col items-center justify-center relative"
            >
              <div 
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-full max-w-5xl max-h-[800px] flex flex-col items-center justify-center gap-6 rounded border-2 border-dashed transition-all duration-200 cursor-pointer group
                  ${isDragging ? 'border-primary bg-surface-hover' : 'border-text-muted bg-surface hover:border-primary hover:bg-surface-hover'}`}
              >
                <div className={`transition-transform duration-200 text-primary ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <UploadCloud size={64} />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">Drag and drop your image here</h2>
                  <p className="text-text-muted text-sm max-w-[300px]">
                    Zero-friction local file processing. Total privacy. Supports JPG, PNG, WEBP.
                  </p>
                </div>
                <button className="mt-4 w-[180px] h-10 border border-primary text-primary text-sm font-semibold rounded-sm hover:bg-primary/10 transition-colors">
                  Select File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.section>
          )}

          {step === 'crop' && image && (
            <motion.div 
              key="crop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Workspace */}
              <section className="flex-1 relative bg-black/60 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00F0FF 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                
                <div className="relative max-w-full max-h-full p-12 flex items-center justify-center">
                  <div className="relative inline-block shadow-2xl">
                    <img 
                      ref={imageRef}
                      src={image} 
                      alt="To crop" 
                      className="max-w-full max-h-[70vh] object-contain select-none pointer-events-none"
                    />
                    
                    {/* Crop Overlay Simulator */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {/* This is a simplified visual representation. For a real app, I'd use a robust library or complex mouse event handling. */}
                      <div 
                        className="absolute border border-primary crop-mask pointer-events-auto cursor-move"
                        style={{
                          left: `${(cropArea.x / imageSize.width) * 100}%`,
                          top: `${(cropArea.y / imageSize.height) * 100}%`,
                          width: `${(cropArea.width / imageSize.width) * 100}%`,
                          height: `${(cropArea.height / imageSize.height) * 100}%`,
                        }}
                      >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-evenly pointer-events-none">
                          <div className="w-full h-px bg-white/20"></div>
                          <div className="w-full h-px bg-white/20"></div>
                        </div>
                        <div className="absolute inset-0 flex justify-evenly pointer-events-none">
                          <div className="w-px h-full bg-white/20"></div>
                          <div className="w-px h-full bg-white/20"></div>
                        </div>
                        
                        {/* Handles */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary"></div>
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary"></div>
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sidebar */}
              <aside className="w-[340px] border-l border-border-dark bg-surface flex flex-col shrink-0">
                <div className="p-6 border-b border-border-dark">
                  <h3 className="text-xs font-bold tracking-widest text-text-muted mb-5 uppercase flex items-center gap-2">
                    <Ruler size={14} />
                    Dimensions
                  </h3>
                  
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-text-muted mb-1.5 font-medium uppercase">Width</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={Math.round(cropArea.width)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setCropArea(prev => ({ ...prev, width: val, height: aspectLocked ? (val * (prev.height / prev.width)) : prev.height }));
                          }}
                          className="w-full h-10 bg-black/40 border border-border-dark rounded-sm text-text-main font-mono text-sm px-3 focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-text-muted font-mono pointer-events-none">PX</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setAspectLocked(!aspectLocked)}
                      className={`h-10 w-10 flex items-center justify-center rounded-sm transition-colors border ${aspectLocked ? 'bg-primary/10 border-primary text-primary' : 'bg-black/40 border-border-dark text-text-muted'}`}
                    >
                      <LinkIcon size={16} />
                    </button>

                    <div className="flex-1">
                      <label className="block text-[10px] text-text-muted mb-1.5 font-medium uppercase">Height</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={Math.round(cropArea.height)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setCropArea(prev => ({ ...prev, height: val, width: aspectLocked ? (val * (prev.width / prev.height)) : prev.width }));
                          }}
                          className="w-full h-10 bg-black/40 border border-border-dark rounded-sm text-text-main font-mono text-sm px-3 focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-text-muted font-mono pointer-events-none">PX</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1"></div>

                <div className="p-6 bg-black/20">
                  <AdSlot type="square" />
                  <button 
                    onClick={renderCrop}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-background-dark font-bold text-sm tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                  >
                    <CheckCircle size={18} />
                    RENDER CROP
                  </button>
                </div>
              </aside>
            </motion.div>
          )}

          {step === 'export' && croppedImage && (
            <motion.div 
              key="export"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Preview Stage */}
              <div className="flex-1 checkerboard flex items-center justify-center p-12 overflow-hidden">
                <div className="relative shadow-2xl border border-border-dark bg-background-dark max-w-full max-h-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={croppedImage} 
                    alt="Cropped Preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Bottom Control Deck */}
              <footer className="bg-surface border-t border-border-dark p-6 shrink-0">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex flex-col items-center lg:items-start gap-4 w-full lg:w-auto">
                    <p className="font-mono text-text-muted text-xs tracking-wider uppercase">
                      {Math.round(cropArea.width)}x{Math.round(cropArea.height)} • PNG • LOCAL
                    </p>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                      <button 
                        onClick={() => setStep('crop')}
                        className="flex-1 lg:flex-none px-6 py-3 bg-surface border border-border-dark text-text-main text-sm font-semibold rounded-sm hover:bg-border-dark transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={18} />
                        Reset
                      </button>
                      <a 
                        href={croppedImage}
                        download="studio-crop.png"
                        className="flex-1 lg:flex-none px-8 py-3 bg-accent-green text-background-dark text-sm font-bold rounded-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)] flex items-center justify-center gap-2"
                      >
                        <Download size={18} />
                        Download .PNG
                      </a>
                    </div>
                  </div>

                  <AdSlot type="leaderboard" />
                </div>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
