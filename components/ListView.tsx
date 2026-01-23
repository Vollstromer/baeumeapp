
import React from 'react';
import { Meadow, Tree, TreeCondition } from '../types';

interface ListViewProps {
  meadows: Meadow[];
  trees: Tree[];
  onEditMeadow: (meadow: Meadow) => void;
  onEditTree: (tree: Tree) => void;
  onMeadowClick: (meadow: Meadow) => void;
  onTreeDetails: (tree: Tree) => void;
  onAddTree: () => void;
  onAddMeadow: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ 
  meadows, 
  trees, 
  onEditMeadow, 
  onEditTree, 
  onMeadowClick,
  onTreeDetails, 
  onAddTree, 
  onAddMeadow,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="bg-background-dark h-full flex flex-col overflow-y-auto no-scrollbar pb-32">
      <div className="w-full border-b border-solid border-border-dark bg-background-dark sticky top-0 z-40">
        <div className="mx-auto max-w-[1200px] px-4 md:px-10 py-4">
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center justify-center size-10 shrink-0 rounded-full bg-surface-dark border border-border-dark text-primary">
                <span className="material-symbols-outlined text-[24px]">forest</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-white text-xl md:text-2xl font-bold leading-tight tracking-[-0.015em] truncate">Meine Bestände</h2>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 bg-primary rounded-full animate-pulse shrink-0"></span>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black truncate">Cloud synchronisiert</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-row items-center gap-2 w-full">
              <button 
                onClick={onAddTree}
                className="flex-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-11 px-2 md:px-6 bg-primary text-background-dark hover:bg-green-400 transition-colors text-xs md:text-sm font-bold shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px] md:mr-2">add</span>
                <span className="truncate">Baum</span>
              </button>
              <button 
                onClick={onAddMeadow}
                className="flex-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-11 px-2 md:px-6 bg-primary text-background-dark hover:bg-green-400 transition-colors text-xs md:text-sm font-bold shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px] md:mr-2">add</span>
                <span className="truncate">Wiese</span>
              </button>
            </div>
          </header>
        </div>
      </div>

      <div className="flex-1 flex justify-center py-4 md:py-10 px-0 md:px-6">
        <div className="flex flex-col max-w-[960px] w-full gap-6 px-4">
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="w-full bg-surface-dark border border-border-dark rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-base" 
                placeholder="Wiese oder Sorte suchen..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-white tracking-tight text-lg font-bold">Übersicht</h3>
            <span className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">
              {meadows.length} {meadows.length === 1 ? 'Wiese' : 'Wiesen'} • {trees.length} {trees.length === 1 ? 'Baum' : 'Bäume'}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {meadows.map((meadow, index) => {
              const meadowTrees = trees.filter(t => t.meadowId === meadow.id);
              return (
                <details 
                  key={meadow.id} 
                  className="group list-item-optimized flex flex-col rounded-2xl border border-border-dark bg-surface-dark overflow-hidden transition-all duration-300 shadow-sm"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 md:p-5 hover:bg-white/5 transition-colors select-none">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onMeadowClick(meadow);
                        }}
                        className="size-10 shrink-0 rounded-lg bg-green-900/30 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary hover:text-background-dark transition-all shadow-inner active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[20px]">{meadow.icon}</span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-base md:text-lg font-bold leading-tight truncate">{meadow.name}</p>
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditMeadow(meadow); }}
                            className="text-text-secondary hover:text-primary transition-colors flex items-center active:scale-90"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        </div>
                        <p className="text-text-secondary text-[11px] md:text-sm font-medium mt-0.5 truncate">
                          {meadowTrees.length} {meadowTrees.length === 1 ? 'Baum' : 'Bäume'} • {meadow.lastChecked}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-text-secondary transition-transform duration-300 group-open:rotate-180 flex items-center">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </summary>
                  <div className="border-t border-border-dark bg-background-dark/30 overflow-x-hidden">
                    {meadowTrees.length > 0 ? (
                      <table className="w-full table-fixed border-collapse">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="px-2 md:px-4 py-3 text-left text-[10px] md:text-xs font-black uppercase tracking-widest text-text-secondary w-[45%] md:w-auto">Sorte</th>
                            <th className="px-2 md:px-4 py-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest text-text-secondary w-[15%]">Jahr</th>
                            <th className="px-2 md:px-4 py-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest text-text-secondary w-[25%] md:w-[120px]">Status</th>
                            <th className="px-2 md:px-4 py-3 text-right text-[10px] md:text-xs font-black uppercase tracking-widest text-text-secondary w-[15%] md:w-20">Aktion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {meadowTrees.map((tree) => (
                            <tr key={tree.id} className="hover:bg-white/5 transition-colors group/row active:bg-white/10">
                              <td 
                                className="px-2 md:px-4 py-3 cursor-pointer" 
                                onClick={() => onTreeDetails(tree)}
                              >
                                <div className="text-white text-[11px] md:text-sm font-bold truncate leading-tight">
                                  {tree.variety}
                                </div>
                              </td>
                              <td className="px-2 md:px-4 py-3 text-center">
                                <span className="text-text-secondary text-[11px] md:text-sm font-medium">
                                  {new Date(tree.plantingDate).getFullYear()}
                                </span>
                              </td>
                              <td className="px-2 md:px-4 py-3 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-black uppercase tracking-tighter whitespace-nowrap
                                  ${tree.condition === TreeCondition.HEALTHY ? 'text-green-400 bg-green-500/10' : 
                                    tree.condition === TreeCondition.NEEDS_CARE ? 'text-yellow-400 bg-yellow-500/10' : 
                                    'text-red-400 bg-red-500/10'}`}>
                                  {tree.condition === TreeCondition.HEALTHY ? 'OK' : 
                                   tree.condition === TreeCondition.NEEDS_CARE ? 'Pflege' : 'Kritisch'}
                                </span>
                              </td>
                              <td className="px-2 md:px-4 py-3 text-right">
                                <button 
                                  onClick={() => onEditTree(tree)}
                                  className="text-text-secondary hover:text-primary transition-colors flex items-center justify-center ml-auto active:scale-90"
                                >
                                  <span className="material-symbols-outlined text-[18px] md:text-[20px]">edit</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-text-secondary text-sm italic">
                        Noch keine Bäume erfasst.
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ListView);
