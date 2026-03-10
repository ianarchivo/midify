import { useState } from 'react';
import { Sparkles, Music, Play, Plus, X, Minus } from 'lucide-react';
import './App.css';

// Using electronAPI exposed from preload
const electron = (window as unknown as { electronAPI: { minimizeWindow: () => void; closeWindow: () => void } }).electronAPI;

function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const credits = 50; // Mock credits for now

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const closeWindow = () => electron?.closeWindow();
  const minimizeWindow = () => electron?.minimizeWindow();

  return (
    <div className="w-full h-screen bg-black/40 backdrop-blur-2xl text-white flex flex-col font-sans overflow-hidden border border-white/10 rounded-2xl shadow-2xl">
      {/* Custom Titlebar */}
      <div className="app-region-drag h-10 w-full flex justify-between items-center px-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-white/80">
          <Music size={16} className="text-purple-400" />
          <span className="text-sm font-semibold tracking-wide">Midify</span>
        </div>
        <div className="flex items-center gap-3 app-region-no-drag">
          <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-xs font-medium text-purple-200">
            <Sparkles size={12} />
            {credits} Credits
          </div>
          <button onClick={minimizeWindow} className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white">
            <Minus size={16} />
          </button>
          <button onClick={closeWindow} className="p-1 hover:bg-red-500/80 rounded-md transition-colors text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
        {/* Input Area */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-white/80 flex justify-between">
            <span>Describe your melody</span>
            <span className="text-white/40 text-xs">AI Generation</span>
          </label>
          <div className="relative">
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/30"
              rows={3}
              placeholder="e.g. A dark, cinematic piano melody in D minor with a driving rhythm..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-500 text-white p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              disabled={isGenerating || !prompt}
            >
              <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Library */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm font-medium text-white/80">
            <span>Recent Generates</span>
            <button className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs">
              View All <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex items-center gap-4 transition-all cursor-grab active:cursor-grabbing">
                <button className="h-10 w-10 shrink-0 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-purple-500 transition-colors">
                  <Play size={18} className="ml-0.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">Dark Cinematic Piano #{i}</h4>
                  <p className="text-xs text-white/40 truncate">D minor • 120 BPM • 15s</p>
                </div>
                <div className="ext-white/40 text-xs font-mono">
                  Today
                </div>
                {/* Drag Hint */}
                <div className="absolute inset-0 bg-purple-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs font-medium tracking-widest uppercase">Drag to DAW</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
