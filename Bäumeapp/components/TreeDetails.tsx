
import React, { useState, useEffect } from 'react';
import { Tree, TreeCondition } from '../types';

interface TreeDetailsProps {
  tree: Tree;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const TreeDetails: React.FC<TreeDetailsProps> = ({ tree, onEdit, onDelete, onClose }) => {
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  // Esc-Taste zum Schließen der Lightbox
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsImageExpanded(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="bg-background-dark h-full flex flex-col text-white animate-fade-in overflow-y-auto no-scrollbar relative">
      {/* Lightbox / Fullscreen Image Overlay */}
      {isImageExpanded && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in p-4 md:p-10 cursor-zoom-out"
          onClick={() => setIsImageExpanded(false)}
        >
          <button 
            className="absolute top-6 right-6 z-[110] size-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
            onClick={(e) => { e.stopPropagation(); setIsImageExpanded(false); }}
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          
          <img 
            src={tree.imageUrl || 'https://picsum.photos/1200/1200'} 
            alt={tree.variety}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
            <p className="text-white/70 text-sm font-medium">{tree.variety}</p>
          </div>
        </div>
      )}

      <header className="w-full flex justify-center bg-surface-dark/50 border-b border-border-dark sticky top-0 z-50 backdrop-blur-md">
        <div className="w-full max-w-[1200px] flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 text-primary">
            <span className="material-symbols-outlined text-3xl">park</span>
            <h2 className="text-xl font-display font-bold text-white">Baum-Akte</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-primary transition-colors bg-white/5 rounded-full w-10 h-10 flex items-center justify-center border border-white/5"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex justify-center py-8 px-4">
        <div className="w-full max-w-[1200px]">
          <div className="bg-surface-dark rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-2xl border border-border-dark flex flex-col gap-10">
            <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
              <div className="shrink-0 group relative">
                {/* Klickbares Bild mit Hover-Effekt */}
                <button 
                  onClick={() => setIsImageExpanded(true)}
                  className="relative block rounded-[2rem] overflow-hidden h-72 w-72 sm:h-80 sm:w-80 lg:h-[400px] lg:w-[400px] shadow-2xl border-4 border-white/5 transition-transform duration-500 hover:scale-[1.02] cursor-zoom-in"
                >
                  <img 
                    src={tree.imageUrl || 'https://picsum.photos/600/600'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={tree.variety}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="size-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-4xl">zoom_in</span>
                    </div>
                  </div>
                </button>
                <p className="text-center mt-4 text-text-secondary text-xs font-bold uppercase tracking-widest opacity-50">Bild anklicken zum Vergrößern</p>
              </div>
              
              <div className="flex flex-col gap-6 text-center lg:text-left flex-1 py-4 justify-center">
                <h1 className="text-4xl lg:text-6xl font-display font-bold leading-tight tracking-tight">{tree.variety}</h1>
                <div className="text-text-secondary text-xl lg:text-2xl leading-relaxed max-w-2xl font-medium whitespace-pre-wrap">
                  {tree.description ? tree.description : (
                    <span className="opacity-40 italic font-normal">Keine zusätzliche Beschreibung für diesen Baum hinterlegt.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-border-dark"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-black/20 border border-border-dark transition-colors hover:border-white/10 group">
                <span className="flex items-center gap-3 text-text-secondary text-sm uppercase tracking-widest font-bold group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">event</span> Pflanzdatum
                </span>
                <p className="text-xl lg:text-3xl font-bold">{new Date(tree.plantingDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-black/20 border border-border-dark transition-colors hover:border-white/10 group">
                <span className="flex items-center gap-3 text-text-secondary text-sm uppercase tracking-widest font-bold group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">health_and_safety</span> Vitalitäts-Status
                </span>
                <div>
                  <span className={`inline-flex items-center rounded-2xl px-6 py-3 text-lg font-bold ring-2 ring-inset 
                    ${tree.condition === TreeCondition.HEALTHY ? 'bg-green-500/20 text-green-400 ring-green-600/30' : 
                      tree.condition === TreeCondition.NEEDS_CARE ? 'bg-yellow-500/20 text-yellow-400 ring-yellow-600/30' : 
                      'bg-red-500/20 text-red-400 ring-red-600/30'}`}>
                    {tree.condition}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-6">
              <button 
                onClick={onEdit}
                className="flex-1 h-20 px-8 flex items-center justify-center gap-4 rounded-[1.5rem] bg-primary hover:bg-[#0be00b] text-background-dark text-xl font-bold tracking-wide transition-all duration-200 shadow-xl shadow-primary/20 transform active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-3xl">edit</span>
                <span>Daten anpassen</span>
              </button>
              <button 
                onClick={onDelete}
                className="flex-1 h-20 px-8 flex items-center justify-center gap-4 rounded-[1.5rem] bg-white/5 border-2 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 text-xl font-bold tracking-wide transition-all duration-200 transform active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-3xl">delete</span>
                <span>Entfernen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in {
          animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default TreeDetails;
