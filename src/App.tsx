/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, 
  Copy, 
  RotateCcw, 
  Shuffle, 
  Save, 
  Trash2, 
  FileJson, 
  Upload,
  Settings2,
  Stamp,
  History,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface StampConfig {
  shape: 'circular' | 'rectangular';
  topText: string;
  bottomText: string;
  centerText: string;
  dateText: string;
  fontFamily: string;
  fontWeight: string;
  ringThickness: number;
  radius: number; // For circular: radius, For rectangular: width/2
  padding: number;
  inkColor: string;
  distress: number;
  noise: number;
  inkBleed: number;
  rotation: number;
  opacity: number;
  addSmudge: boolean;
  misalignment: boolean;
}

interface SavedTemplate {
  id: string;
  name: string;
  timestamp: number;
  config: StampConfig;
}

// --- Constants ---

const DEFAULT_CONFIG: StampConfig = {
  shape: 'circular',
  topText: "PLUSASSURANCE",
  bottomText: "INTERNAL DEMO ONLY",
  centerText: "SAMPLE",
  dateText: new Date().toISOString().split('T')[0],
  fontFamily: "serif",
  fontWeight: "bold",
  ringThickness: 4,
  radius: 140,
  padding: 20,
  inkColor: "#1a365d", // Deep blue
  distress: 15,
  noise: 20,
  inkBleed: 5,
  rotation: -2,
  opacity: 0.9,
  addSmudge: false,
  misalignment: true,
};

const FONT_OPTIONS = [
  { label: 'Serif (Classic)', value: 'serif' },
  { label: 'Sans-Serif (Modern)', value: 'sans-serif' },
  { label: 'Monospace (Typewriter)', value: 'monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial Black', value: '"Arial Black", sans-serif' },
];

const PRESETS: Record<string, Partial<StampConfig>> = {
  'Clean': {
    distress: 0,
    noise: 5,
    inkBleed: 0,
    misalignment: false,
    opacity: 1,
  },
  'Office Stamp': {
    distress: 10,
    noise: 15,
    inkBleed: 10,
    misalignment: true,
    opacity: 0.9,
  },
  'Distressed Demo': {
    distress: 45,
    noise: 40,
    inkBleed: 25,
    misalignment: true,
    opacity: 0.75,
  }
};

// --- Helper Functions ---

const drawCurvedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  isBottom: boolean
) => {
  const characters = text.split('');
  const totalAngle = Math.PI * 0.8; // Use 80% of the semi-circle
  const step = totalAngle / (characters.length - 1 || 1);
  
  ctx.save();
  ctx.translate(centerX, centerY);

  characters.forEach((char, i) => {
    const angle = isBottom 
      ? startAngle - (i * step) 
      : startAngle + (i * step);
    
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, isBottom ? radius : -radius);
    
    // For bottom text, we need to flip the characters so they are readable
    if (isBottom) {
      ctx.rotate(Math.PI);
    }
    
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
};

// --- Main Component ---

export default function App() {
  const [config, setConfig] = useState<StampConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('stamp_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse templates", e);
      }
    }
  }, []);

  // Save templates to localStorage
  const saveTemplates = (newTemplates: SavedTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('stamp_templates', JSON.stringify(newTemplates));
  };

  const drawStamp = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { 
      shape, topText, bottomText, centerText, dateText, 
      fontFamily, fontWeight, ringThickness, radius, 
      padding, inkColor, distress, noise, inkBleed, 
      rotation, opacity, addSmudge, misalignment 
    } = config;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Setup offscreen canvas for effects
    const offCanvas = document.createElement('canvas');
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    offCtx.save();
    offCtx.globalAlpha = opacity;
    offCtx.translate(centerX, centerY);
    offCtx.rotate((rotation * Math.PI) / 180);
    offCtx.translate(-centerX, -centerY);

    // Misalignment simulation
    if (misalignment) {
      offCtx.translate((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    }

    offCtx.strokeStyle = inkColor;
    offCtx.fillStyle = inkColor;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    if (shape === 'circular') {
      // 1. Draw Outer Ring
      offCtx.lineWidth = ringThickness;
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      offCtx.stroke();

      // 2. Draw Inner Ring
      offCtx.lineWidth = ringThickness * 0.6;
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
      offCtx.stroke();

      // 3. Draw Curved Text
      const fontSize = Math.max(12, radius / 8);
      offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      
      // Top Arc
      drawCurvedText(
        offCtx, 
        topText.toUpperCase(), 
        centerX, 
        centerY, 
        radius - 8, 
        -Math.PI * 0.4, 
        false
      );

      // Bottom Arc
      drawCurvedText(
        offCtx, 
        bottomText.toUpperCase(), 
        centerX, 
        centerY, 
        radius - 8, 
        Math.PI * 0.4, 
        true
      );

      // 4. Draw Separators (Stars)
      offCtx.font = `${fontSize}px serif`;
      const drawSeparator = (angle: number) => {
        offCtx.save();
        offCtx.translate(centerX, centerY);
        offCtx.rotate(angle);
        offCtx.fillText("★", radius - 8, 0);
        offCtx.restore();
      };
      drawSeparator(0);
      drawSeparator(Math.PI);

      // 5. Draw Center Text
      const centerFontSize = Math.max(20, radius / 4);
      offCtx.font = `${fontWeight} ${centerFontSize}px ${fontFamily}`;
      offCtx.fillText(centerText.toUpperCase(), centerX, centerY - 10);

      // 6. Draw Date Text
      if (dateText) {
        offCtx.font = `normal ${fontSize * 0.7}px ${fontFamily}`;
        offCtx.fillText(`DATE: ${dateText}`, centerX, centerY + 25);
      }

      // 7. Decorative Dots
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, radius - 30, 0, Math.PI * 2);
      offCtx.setLineDash([2, 10]);
      offCtx.lineWidth = 1;
      offCtx.stroke();
      offCtx.setLineDash([]);
    } else {
      // Rectangular Stamp
      const width = radius * 2;
      const height = radius * 1.2;
      const x = centerX - width / 2;
      const y = centerY - height / 2;

      // 1. Draw Outer Border
      offCtx.lineWidth = ringThickness;
      offCtx.strokeRect(x, y, width, height);

      // 2. Draw Inner Border
      offCtx.lineWidth = ringThickness * 0.6;
      offCtx.strokeRect(x + 10, y + 10, width - 20, height - 20);

      const fontSize = Math.max(12, radius / 10);
      offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      // Top Text
      offCtx.fillText(topText.toUpperCase(), centerX, y + 25);
      
      // Bottom Text
      offCtx.fillText(bottomText.toUpperCase(), centerX, y + height - 25);

      // Center Text
      const centerFontSize = Math.max(24, radius / 3.5);
      offCtx.font = `${fontWeight} ${centerFontSize}px ${fontFamily}`;
      offCtx.fillText(centerText.toUpperCase(), centerX, centerY - 5);

      // Date Text
      if (dateText) {
        offCtx.font = `normal ${fontSize * 0.8}px ${fontFamily}`;
        offCtx.fillText(`DATE: ${dateText}`, centerX, centerY + 25);
      }
    }

    offCtx.restore();

    // --- Apply Realistic Effects ---
    
    const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Ink Bleed (Subtle Blur)
    if (inkBleed > 0) {
      offCtx.filter = `blur(${inkBleed / 20}px)`;
      offCtx.drawImage(offCanvas, 0, 0);
    }

    // Procedural Noise & Distress
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // If pixel is not transparent
        // Noise effect (density variation)
        const n = Math.random() * noise;
        data[i + 3] = Math.max(0, data[i + 3] - n);

        // Distress effect (random pixel removal)
        if (Math.random() * 100 < distress) {
          data[i + 3] = 0;
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Add Smudge
    if (addSmudge) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.ellipse(centerX + 20, centerY + 20, 60, 30, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

  }, [config]);

  useEffect(() => {
    drawStamp();
  }, [drawStamp]);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setConfig(prev => ({ ...prev, [name]: val }));
  };

  const handleSliderChange = (name: string, value: number) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const applyPreset = (presetName: string) => {
    setConfig(prev => ({ ...prev, ...PRESETS[presetName] }));
  };

  const handleRandomize = () => {
    setConfig(prev => ({
      ...prev,
      distress: Math.random() * 40,
      noise: Math.random() * 30,
      inkBleed: Math.random() * 15,
      rotation: (Math.random() - 0.5) * 10,
      opacity: 0.7 + Math.random() * 0.3,
    }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `stamp-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert("Copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Failed to copy to clipboard. Your browser might not support this feature.");
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const newTemplate: SavedTemplate = {
      id: crypto.randomUUID(),
      name: templateName,
      timestamp: Date.now(),
      config: { ...config }
    };
    saveTemplates([newTemplate, ...templates]);
    setTemplateName("");
  };

  const handleDeleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  const handleLoadTemplate = (t: SavedTemplate) => {
    setConfig(t.config);
  };

  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "stamp-config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setConfig(prev => ({ ...prev, ...imported }));
      } catch (err) {
        alert("Invalid config file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-stone-900 p-2 rounded-lg">
            <Stamp className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Circular Stamp Generator</h1>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Internal Demo Tool</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600"
            title="Reset to Default"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleRandomize}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600"
            title="Randomize Effects"
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
              <Settings2 className="w-5 h-5 text-stone-400" />
              <h2 className="font-semibold">Stamp Configuration</h2>
            </div>

            {/* Shape Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase">Stamp Shape</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, shape: 'circular' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${config.shape === 'circular' ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}
                >
                  Circular
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, shape: 'rectangular' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${config.shape === 'rectangular' ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}
                >
                  Rectangular
                </button>
              </div>
            </div>

            {/* Text Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase">Top Text</label>
                <input 
                  type="text" 
                  name="topText"
                  value={config.topText}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase">Bottom Text</label>
                <input 
                  type="text" 
                  name="bottomText"
                  value={config.bottomText}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase">Center Text (Mandatory)</label>
                <input 
                  type="text" 
                  name="centerText"
                  value={config.centerText}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase">Date</label>
                <input 
                  type="date" 
                  name="dateText"
                  value={config.dateText}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            {/* Visual Controls */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 uppercase">Font</label>
                  <select 
                    name="fontFamily"
                    value={config.fontFamily}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none"
                  >
                    {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 uppercase">Ink Color</label>
                  <input 
                    type="color" 
                    name="inkColor"
                    value={config.inkColor}
                    onChange={handleInputChange}
                    className="w-full h-10 p-1 bg-stone-50 border border-stone-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Sliders */}
              {[
                { label: 'Distress', name: 'distress', min: 0, max: 100 },
                { label: 'Noise', name: 'noise', min: 0, max: 100 },
                { label: 'Ink Bleed', name: 'inkBleed', min: 0, max: 100 },
                { label: 'Rotation', name: 'rotation', min: -10, max: 10 },
                { label: 'Opacity', name: 'opacity', min: 0.2, max: 1.0, step: 0.05 },
              ].map(slider => (
                <div key={slider.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-stone-500 uppercase">{slider.label}</label>
                    <span className="text-[10px] font-mono text-stone-400">{config[slider.name as keyof StampConfig]}</span>
                  </div>
                  <input 
                    type="range" 
                    min={slider.min} 
                    max={slider.max} 
                    step={slider.step || 1}
                    value={config[slider.name as keyof StampConfig] as number}
                    onChange={(e) => handleSliderChange(slider.name, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
                  />
                </div>
              ))}

              {/* Checkboxes */}
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    name="addSmudge"
                    checked={config.addSmudge}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900 transition-colors">Add Smudge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    name="misalignment"
                    checked={config.misalignment}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900 transition-colors">Misalignment</span>
                </label>
              </div>
            </div>
          </section>

          {/* Presets */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Quick Presets</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map(name => (
                <button 
                  key={name}
                  onClick={() => applyPreset(name)}
                  className="px-3 py-1.5 bg-stone-50 hover:bg-stone-900 hover:text-white border border-stone-200 rounded-full text-xs font-medium transition-all"
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Center: Canvas & Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <motion.div 
              layout
              className="relative z-10 bg-white p-4 rounded-xl shadow-2xl border border-stone-100"
            >
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={400} 
                className="max-w-full h-auto cursor-crosshair"
              />
            </motion.div>

            <div className="mt-8 flex gap-3 z-10">
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button 
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-stone-900 border border-stone-200 rounded-xl font-semibold hover:bg-stone-50 transition-all shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>

          {/* Safety Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Safety Notice:</strong> This tool is for design prototyping and testing only. Generated graphics are watermarked with "SAMPLE" or "DEMO" and are not intended for official, legal, or authoritative use.
            </p>
          </div>
        </div>

        {/* Right Panel: Template Manager */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6 flex flex-col h-full">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
              <History className="w-5 h-5 text-stone-400" />
              <h2 className="font-semibold">Template Manager</h2>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Template Name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-stone-900"
                />
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="p-2 bg-stone-900 text-white rounded-lg disabled:opacity-50 hover:bg-stone-800 transition-colors"
                >
                  <Save className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleExportConfig}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  Export JSON
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 py-2 border border-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import JSON
                  <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm italic">
                    No saved templates yet.
                  </div>
                ) : (
                  templates.map(t => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group flex items-center justify-between p-3 bg-stone-50 border border-stone-100 rounded-xl hover:border-stone-300 transition-all"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLoadTemplate(t)}
                      >
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                        <p className="text-[10px] text-stone-400">{new Date(t.timestamp).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-8 px-6 text-center">
        <p className="text-sm text-stone-400 font-medium">
          Generated demo stamp for testing — not for official use.
        </p>
        <div className="mt-4 flex justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="w-8 h-8 bg-stone-900 rounded-full"></div>
          <div className="w-8 h-8 bg-stone-900 rounded-full"></div>
          <div className="w-8 h-8 bg-stone-900 rounded-full"></div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e7e5e4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d6d3d1;
        }
      `}</style>
    </div>
  );
}
