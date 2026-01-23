
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Tree, TreeCondition, Meadow } from '../types';
import { MapStyle } from '../App';

interface MapViewProps {
  trees: Tree[];
  meadows: Meadow[];
  selectedTreeId: string | null;
  selectedMeadowId?: string | null;
  onTreeClick: (tree: Tree) => void;
  onMeadowClick: (meadow: Meadow) => void;
  onDeselect: () => void;
  onViewDetails: (tree: Tree) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mapStyle: MapStyle;
  setMapStyle: (style: MapStyle) => void;
}

const MapView: React.FC<MapViewProps> = ({ 
  trees, 
  meadows = [], 
  selectedTreeId, 
  selectedMeadowId,
  onTreeClick, 
  onMeadowClick,
  onDeselect,
  onViewDetails,
  searchQuery, 
  setSearchQuery,
  mapStyle,
  setMapStyle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const alkisLayerRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const meadowMarkersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const userAccuracyCircleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationPosition | null>(null);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTree = useMemo(() => trees.find(t => t.id === selectedTreeId), [trees, selectedTreeId]);
  const selectedMeadow = useMemo(() => meadows.find(m => m.id === selectedMeadowId), [meadows, selectedMeadowId]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !isSearchExpanded) return [];
    
    const query = searchQuery.toLowerCase();
    const matchedTrees = trees
      .filter(t => t.variety.toLowerCase().includes(query))
      .map(t => ({ ...t, type: 'tree' as const }));
    
    const matchedMeadows = meadows
      .filter(m => m.name.toLowerCase().includes(query))
      .map(m => ({ ...m, type: 'meadow' as const }));

    return [...matchedTrees, ...matchedMeadows].slice(0, 8);
  }, [searchQuery, trees, meadows, isSearchExpanded]);

  const updateTileLayer = useCallback((style: MapStyle) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let applyFilter = true;

    switch (style) {
      case 'dark':
        url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        applyFilter = false;
        break;
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        applyFilter = false;
        break;
      case 'standard':
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        applyFilter = true;
        break;
    }

    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      if (applyFilter) tilePane.classList.add('dark-filter');
      else tilePane.classList.remove('dark-filter');
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 22,
      maxNativeZoom: 19,
      detectRetina: true,
      keepBuffer: 2
    }).addTo(map);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setShowAccuracy(false);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.remove();
      userAccuracyCircleRef.current = null;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    lastPosRef.current = null;
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    
    const map = L.map(mapContainerRef.current, {
      center: [48.8854, 9.5311],
      zoom: 14,
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      tap: false,
      bounceAtZoomLimits: false
    });

    mapInstanceRef.current = map;
    updateTileLayer(mapStyle);

    map.on('click', onDeselect);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => {
      stopTracking();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [updateTileLayer, onDeselect, stopTracking]);

  useEffect(() => {
    updateTileLayer(mapStyle);
  }, [mapStyle, updateTileLayer]);

  // Funktion zum Umschalten der Grenzen (mit manuellem Zoom)
  const toggleALKISBoundaries = () => {
    const nextState = !showBoundaries;
    setShowBoundaries(nextState);
    
    const map = mapInstanceRef.current;
    if (nextState && map && map.getZoom() < 15) {
      map.setZoom(16, { animate: true });
    }
  };

  // Stabiles ALKIS Layer Management
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Erstelle ALKIS Pane für Invertierungs-Filter
    if (!map.getPane('alkisPane')) {
      const pane = map.createPane('alkisPane');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    // Filter-Update bei Stilwechsel
    const alkisPane = map.getPane('alkisPane');
    if (alkisPane) {
      const needsInversion = mapStyle !== 'standard';
      alkisPane.style.filter = needsInversion 
        ? 'invert(100%) brightness(300%) contrast(150%)' 
        : 'none';
    }

    // Layer hinzufügen/entfernen
    if (showBoundaries) {
      if (!alkisLayerRef.current) {
        alkisLayerRef.current = L.tileLayer.wms('https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_INSP_BW_Flst_ALKIS', {
          layers: 'cp:CadastralParcel',
          format: 'image/png',
          transparent: true,
          version: '1.3.0',
          pane: 'alkisPane',
          opacity: 0.9,
          attribution: 'LGL BW (ALKIS)',
          minZoom: 15,
          maxZoom: 22
        }).addTo(map);
      }
    } else {
      if (alkisLayerRef.current) {
        alkisLayerRef.current.remove();
        alkisLayerRef.current = null;
      }
    }
  }, [showBoundaries, mapStyle]);

  const updateUserLocation = useCallback((pos: GeolocationPosition, forceFly: boolean = false) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!map) return;
    
    lastPosRef.current = pos;
    const { latitude, longitude, accuracy } = pos.coords;

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({ className: 'user-location-marker', iconSize: [18, 18], iconAnchor: [9, 9] });
      userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 3000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    }

    if (showAccuracy) {
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#0d7ff2',
          fillColor: '#0d7ff2',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng([latitude, longitude]);
        userAccuracyCircleRef.current.setRadius(accuracy);
      }
    } else if (userAccuracyCircleRef.current) {
      userAccuracyCircleRef.current.remove();
      userAccuracyCircleRef.current = null;
    }

    if (forceFly) map.flyTo([latitude, longitude], 18, { animate: true, duration: 0.8 });
  }, [showAccuracy]);

  const toggleLocationTracking = () => {
    if (isLocating) return;
    if (isTracking) {
      if (!showAccuracy) {
        setShowAccuracy(true);
        if (lastPosRef.current) updateUserLocation(lastPosRef.current, true);
      } else stopTracking();
      return;
    }
    setIsLocating(true);
    const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateUserLocation(pos, true);
        setIsLocating(false);
        setIsTracking(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => updateUserLocation(watchPos),
          (err) => console.warn(err),
          options
        );
      },
      (err) => {
        setIsLocating(false);
        setShowAccuracy(false);
        alert("GPS Signal konnte nicht empfangen werden.");
      },
      options
    );
  };

  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!map) return;
    
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    meadowMarkersRef.current.forEach(m => m.remove());
    meadowMarkersRef.current.clear();

    meadows.forEach(meadow => {
      const isSelected = selectedMeadowId === meadow.id;
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center group transition-all duration-500 ${isSelected ? 'scale-125 z-[1000]' : 'hover:scale-110'}">
            <div class="flex items-center justify-center size-10 rounded-xl shadow-2xl border-2 backdrop-blur-sm transition-all
              ${isSelected ? 'bg-secondary border-white text-white' : 'bg-secondary/20 border-secondary/50 text-secondary'}">
              <span class="material-symbols-outlined text-[20px]">${meadow.icon || 'agriculture'}</span>
            </div>
            ${isSelected ? `<div class="mt-1 bg-secondary text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-lg truncate max-w-[120px] font-bold">${meadow.name}</div>` : ''}
          </div>`,
        className: 'custom-meadow-marker',
        iconSize: [40, 60],
        iconAnchor: [20, 40],
      });
      const marker = L.marker([meadow.location.lat, meadow.location.lng], { icon, zIndexOffset: isSelected ? 2000 : 100 }).addTo(map);
      marker.on('click', (e: any) => { 
        L.DomEvent.stopPropagation(e); 
        onMeadowClick(meadow); 
      });
      meadowMarkersRef.current.set(meadow.id, marker);
    });

    trees.forEach(tree => {
      const isSelected = selectedTreeId === tree.id;
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center group transition-all duration-500 ${isSelected ? 'scale-125 z-[1000]' : 'hover:scale-110'}">
            <div class="relative flex items-center justify-center size-10 rounded-full shadow-2xl border-2 ${isSelected ? 'bg-primary border-white text-background-dark' : 'bg-surface-dark border-primary/50 text-primary'}">
              <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1">park</span>
            </div>
            ${isSelected ? `<div class="mt-1 bg-primary text-background-dark px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-lg truncate max-w-[120px] font-bold">${tree.variety}</div>` : ''}
          </div>`,
        className: 'custom-tree-marker',
        iconSize: [40, 60],
        iconAnchor: [20, 40],
      });
      const marker = L.marker([tree.location.lat, tree.location.lng], { icon, zIndexOffset: isSelected ? 2000 : 500 })
        .addTo(map)
        .on('click', (e: any) => { 
          L.DomEvent.stopPropagation(e); 
          onTreeClick(tree); 
        });
      markersRef.current.set(tree.id, marker);
    });
  }, [trees, meadows, selectedTreeId, selectedMeadowId, onTreeClick, onMeadowClick]);

  useEffect(() => {
    if (selectedTree && mapInstanceRef.current && !isTracking) {
      mapInstanceRef.current.flyTo([selectedTree.location.lat, selectedTree.location.lng], 19, { animate: true, duration: 0.8 });
    }
  }, [selectedTreeId, isTracking, selectedTree]);

  useEffect(() => {
    if (selectedMeadow && mapInstanceRef.current && !isTracking) {
      mapInstanceRef.current.flyTo([selectedMeadow.location.lat, selectedMeadow.location.lng], 16, { animate: true, duration: 0.8 });
    }
  }, [selectedMeadowId, isTracking, selectedMeadow]);

  const handleSuggestionClick = (item: any) => {
    if (item.type === 'tree') onTreeClick(item as Tree);
    else onMeadowClick(item as Meadow);
    setSearchQuery('');
    setIsSearchExpanded(false);
  };

  return (
    <div className="relative w-full h-full bg-background-dark overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-[#101922]" />

      <div className="absolute top-6 left-6 right-6 z-30 pointer-events-none flex items-center justify-between">
        <div className="flex items-center gap-3 pointer-events-auto relative">
          <div className="flex flex-col gap-2">
            <div 
              className={`flex items-center backdrop-blur-xl border border-white/10 shadow-2xl transition-[width,border-radius,background-color] duration-300 ease-in-out overflow-hidden max-w-sm h-14
                ${isSearchExpanded ? 'w-[calc(100vw-8rem)] rounded-2xl bg-surface-dark/95' : 'w-14 rounded-full cursor-pointer bg-border-dark/60 hover:bg-border-dark'}`}
              onClick={(e) => { e.stopPropagation(); if(!isSearchExpanded) { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); } else { setIsSearchExpanded(false); setSearchQuery(''); } }}
            >
              <div className="size-14 shrink-0 flex items-center justify-center transition-all">
                <span className={`material-symbols-outlined transition-colors ${isSearchExpanded ? 'text-primary' : 'text-white'}`}>
                  {isSearchExpanded ? 'close' : 'search'}
                </span>
              </div>
              <input 
                ref={searchInputRef}
                className={`flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-text-secondary px-1 text-sm font-medium transition-opacity duration-200 ${isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'}`} 
                placeholder="Baum oder Wiese finden..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {isSearchExpanded && searchSuggestions.length > 0 && (
              <div className="absolute top-16 left-0 w-full max-w-sm bg-surface-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[100] max-h-[60vh] overflow-y-auto no-scrollbar">
                {searchSuggestions.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => handleSuggestionClick(item)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-all text-left group border-b border-white/5 last:border-none active:bg-white/10"
                  >
                    <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors
                      ${item.type === 'tree' ? 'bg-primary/10 border-primary/20 text-primary group-hover:bg-primary group-hover:text-background-dark' : 'bg-secondary/10 border-secondary/20 text-secondary group-hover:bg-secondary group-hover:text-white'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {item.type === 'tree' ? 'park' : (item.icon || 'agriculture')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{item.type === 'tree' ? item.variety : item.name}</p>
                      {item.type === 'tree' ? (
                        <p className="text-text-secondary text-[10px] font-medium truncate">
                          <span className="font-black uppercase tracking-widest mr-1.5">Baum</span>
                          • {meadows.find(m => m.id === item.meadowId)?.name || 'Unbekannte Wiese'}
                        </p>
                      ) : (
                        <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest">Wiese</p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity text-sm">north_west</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
             <button 
              onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
              className={`flex size-14 items-center justify-center rounded-full backdrop-blur-xl border shadow-2xl transition-all active:scale-90
                ${isLayersMenuOpen ? 'bg-primary text-background-dark border-white/20' : 'bg-border-dark/60 text-white border-white/10 hover:bg-border-dark'}`}
            >
              <span className="material-symbols-outlined text-2xl">layers</span>
            </button>
            
            {isLayersMenuOpen && (
              <div className="absolute top-full left-0 mt-3 bg-surface-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[240px] animate-fade-in p-2 flex flex-col gap-1 z-[100]">
                <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">Basiskarte</p>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'standard', label: 'Standard (Hell)', icon: 'map' },
                    { id: 'satellite', label: 'Satellit', icon: 'satellite' },
                    { id: 'dark', label: 'Dunkel', icon: 'dark_mode' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => { setMapStyle(style.id as MapStyle); }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-bold
                        ${mapStyle === style.id ? 'bg-primary text-background-dark' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                      {style.label}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-white/10 my-1 mx-2"></div>
                <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">Flurstücke (BW)</p>
                <div className="px-2 pb-2">
                  <button
                    onClick={toggleALKISBoundaries}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold
                      ${showBoundaries ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">account_balance</span>
                      ALKIS Grenzen
                    </div>
                    <div className={`size-5 rounded-full flex items-center justify-center border transition-all ${showBoundaries ? 'bg-secondary border-secondary' : 'border-white/20'}`}>
                      {showBoundaries && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-32 z-30 pointer-events-auto flex flex-col gap-3">
        <button 
          onClick={toggleLocationTracking}
          disabled={isLocating}
          className={`relative flex size-14 items-center justify-center rounded-2xl backdrop-blur-md shadow-2xl transition-all border active:scale-90
            ${isTracking ? 'bg-secondary text-white border-white/20' : 'bg-surface-dark/80 text-white border-white/10 hover:bg-surface-dark'}
            ${isLocating ? 'animate-pulse' : ''}`}
        >
          <span className={`material-symbols-outlined text-2xl ${isLocating ? 'animate-spin' : ''}`}>
            {isLocating ? 'sync' : (isTracking ? 'location_searching' : 'my_location')}
          </span>
          {isTracking && <span className="absolute -top-1 -right-1 size-3 bg-white rounded-full animate-ping"></span>}
        </button>
      </div>

      {selectedTree && (
        <div className="absolute left-6 bottom-28 z-30 w-[calc(100%-3rem)] max-w-sm animate-fade-in pointer-events-auto">
          <div className="flex flex-col rounded-[2.5rem] bg-surface-dark/95 backdrop-blur-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="relative w-full h-40 overflow-hidden">
              <img src={selectedTree.imageUrl || 'https://picsum.photos/400/200'} className="w-full h-full object-cover" alt={selectedTree.variety} />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent"></div>
              <div className="absolute top-4 right-4 bg-background-dark/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedTree.condition === TreeCondition.HEALTHY ? 'text-primary' : selectedTree.condition === TreeCondition.NEEDS_CARE ? 'text-yellow-400' : 'text-red-400'}`}>{selectedTree.condition}</p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-white text-2xl font-black tracking-tight leading-none mb-4 truncate">{selectedTree.variety}</h3>
              <button onClick={() => onViewDetails(selectedTree)} className="w-full h-12 flex items-center justify-center gap-3 bg-primary text-background-dark rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                <span>Details</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMeadow && !selectedTree && (
        <div className="absolute left-6 bottom-28 z-30 w-[calc(100%-3rem)] max-w-sm animate-fade-in pointer-events-auto">
          <div className="flex flex-col rounded-[2.5rem] bg-surface-dark/95 backdrop-blur-2xl shadow-2xl border border-secondary/30 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">{selectedMeadow.icon}</span>
                </div>
                <div>
                  <h3 className="text-white text-2xl font-black tracking-tight leading-tight truncate">{selectedMeadow.name}</h3>
                  <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest">Wiesen-Objekt</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-text-secondary text-[10px] font-bold uppercase tracking-tighter mb-1">Fläche</p>
                  <p className="text-white font-bold">{selectedMeadow.area} ha</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-text-secondary text-[10px] font-bold uppercase tracking-tighter mb-1">Zuletzt geprüft</p>
                  <p className="text-white font-bold">{selectedMeadow.lastChecked}</p>
                </div>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-6 line-clamp-2 italic">"{selectedMeadow.description}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MapView);
