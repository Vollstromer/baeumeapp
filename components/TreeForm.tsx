
import React, { useState, useEffect, useRef } from 'react';
import { Tree, Meadow, TreeCondition } from '../types';
import { MapStyle } from '../App';
import { db } from '../lib/database';

interface TreeFormProps {
  tree: Tree | null;
  meadows: Meadow[];
  allTrees: Tree[];
  mapStyle: MapStyle;
  onSave: (tree: Partial<Tree>) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const TreeForm: React.FC<TreeFormProps> = ({ tree, meadows, allTrees, mapStyle, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Tree>>(
    tree || {
      variety: '',
      description: '',
      meadowId: meadows[0]?.id || '',
      plantingDate: new Date().toISOString().split('T')[0],
      condition: TreeCondition.HEALTHY,
      location: { lat: 48.8854, lng: 9.5311, address: '' },
    }
  );

  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(tree?.imageUrl || null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const ghostMarkersRef = useRef<any[]>([]);

  const L = (window as any).L;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialLat = formData.location?.lat || 48.8854;
    const initialLng = formData.location?.lng || 9.5311;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true
    });

    mapInstance.current = map;
    updateTileLayer(mapStyle);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      zIndexOffset: 1000
    }).addTo(map);

    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      updateLocation(lat, lng);
    });

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      updateLocation(lat, lng);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  const updateTileLayer = (style: MapStyle) => {
    const map = mapInstance.current;
    if (!map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();

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
      maxNativeZoom: 19
    }).addTo(map);
  };

  useEffect(() => {
    updateTileLayer(mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    ghostMarkersRef.current.forEach(m => m.remove());
    ghostMarkersRef.current = [];

    const neighborTrees = allTrees.filter(t => t.meadowId === formData.meadowId && t.id !== tree?.id);
    
    neighborTrees.forEach(t => {
      const ghostIcon = L.divIcon({
        html: `<div class="opacity-30 scale-75 text-primary"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">park</span></div>`,
        className: 'ghost-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const m = L.marker([t.location.lat, t.location.lng], { icon: ghostIcon, interactive: false }).addTo(map);
      ghostMarkersRef.current.push(m);
    });

    if (!tree) {
      const selectedMeadow = meadows.find(m => m.id === formData.meadowId);
      if (selectedMeadow) {
        map.flyTo([selectedMeadow.location.lat, selectedMeadow.location.lng], 18);
        updateLocation(selectedMeadow.location.lat, selectedMeadow.location.lng);
      }
    }
  }, [formData.meadowId]);

  const updateLocation = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location!, lat, lng }
    }));
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Temporäre Vorschau
      setImagePreview(URL.createObjectURL(file));
      
      setIsUploading(true);
      const publicUrl = await db.uploadImage(file);
      setIsUploading(false);
      
      if (publicUrl) {
        setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
      } else {
        alert("Upload fehlgeschlagen. Bild wird nur lokal gespeichert.");
      }
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateLocation(latitude, longitude);
        mapInstance.current?.flyTo([latitude, longitude], 19);
      },
      () => {
        alert("Standort konnte nicht ermittelt werden.");
      },
      { enableHighAccuracy: true }
    );
  };

  const getConditionStyles = (cond: TreeCondition, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-background-dark border-border-dark text-text-secondary hover:border-white/20';
    }
    
    switch (cond) {
      case TreeCondition.HEALTHY:
        return 'bg-primary/20 text-primary border-primary/50';
      case TreeCondition.NEEDS_CARE:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case TreeCondition.CRITICAL:
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-primary/20 text-primary border-primary/50';
    }
  };

  return (
    <div className="bg-background-dark h-full flex flex-col text-white pb-20 overflow-y-auto no-scrollbar">
      <header className="flex items-center justify-between border-b border-border-dark px-6 md:px-10 py-4 bg-surface-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="size-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-2xl">park</span>
          </div>
          <div>
            <h2 className="text-white font-bold">{tree ? 'Baum bearbeiten' : 'Baum hinzufügen'}</h2>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Bestandserfassung</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSave(formData)}
            disabled={isUploading}
            className={`h-11 px-6 bg-primary text-background-dark rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isUploading ? 'Bild wird geladen...' : 'Speichern'}
          </button>
          <button 
            onClick={onCancel}
            className="size-11 flex items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <section className="bg-surface-dark rounded-3xl p-6 border border-border-dark shadow-xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">info</span>
              </span>
              Baumdaten
            </h3>
            
            <div className="space-y-5">
              <div className="relative group">
                <p className="text-sm font-medium text-text-secondary mb-2 px-1">Foto</p>
                <div 
                  className={`relative w-full h-48 rounded-2xl border-2 border-dashed border-border-dark bg-background-dark overflow-hidden flex flex-col items-center justify-center transition-all hover:border-primary/50 cursor-pointer ${imagePreview ? 'border-solid' : ''}`}
                  onClick={() => document.getElementById('tree-image-input')?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Vorschau" />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <div className="size-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Wird hochgeladen...</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-4xl text-text-secondary mb-2">add_a_photo</span>
                      <p className="text-xs text-text-secondary">Klicken zum Hochladen</p>
                    </>
                  )}
                  <input id="tree-image-input" type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary px-1">Baumsorte</p>
                <input 
                  className="w-full bg-background-dark border border-border-dark rounded-xl h-12 px-4 focus:ring-2 ring-primary/30 outline-none transition-all text-white"
                  placeholder="z.B. Malus domestica (Apfelbaum)"
                  value={formData.variety}
                  onChange={e => setFormData({ ...formData, variety: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary px-1">Beschreibung / Notizen</p>
                <textarea 
                  className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-white focus:ring-2 ring-primary/30 outline-none min-h-[100px] resize-none"
                  placeholder="Besonderheiten, Zustandshistorie, Pflegemaßnahmen..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary px-1">Wiese</p>
                  <select 
                    className="w-full bg-background-dark border border-border-dark rounded-xl h-12 px-4 focus:ring-2 ring-primary/30 outline-none appearance-none text-white"
                    value={formData.meadowId}
                    onChange={e => setFormData({ ...formData, meadowId: e.target.value })}
                  >
                    {meadows.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary px-1">Pflanzdatum</p>
                  <input 
                    type="date"
                    className="w-full bg-background-dark border border-border-dark rounded-xl h-12 px-4 focus:ring-2 ring-primary/30 outline-none text-white"
                    value={formData.plantingDate}
                    onChange={e => setFormData({ ...formData, plantingDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-text-secondary px-1">Zustand</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(TreeCondition).map(cond => {
                    const isSelected = formData.condition === cond;
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setFormData({ ...formData, condition: cond })}
                        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${getConditionStyles(cond, isSelected)}`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {cond === TreeCondition.HEALTHY ? 'verified' : cond === TreeCondition.NEEDS_CARE ? 'build_circle' : 'report_problem'}
                        </span>
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <section className="bg-surface-dark rounded-3xl p-6 border border-border-dark shadow-xl h-full flex flex-col">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="size-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">location_on</span>
              </span>
              Standort auf der Karte
            </h3>

            <button 
              type="button"
              onClick={getCurrentLocation}
              className="w-full h-12 flex items-center justify-center gap-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold hover:bg-secondary/20 transition-all mb-4"
            >
              <span className="material-symbols-outlined">my_location</span>
              Meine Position verwenden
            </button>

            <div className="flex-1 min-h-[450px] relative rounded-2xl overflow-hidden border border-border-dark z-0 shadow-inner">
              <div ref={mapRef} className="absolute inset-0 h-full w-full bg-[#101922]" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-text-secondary uppercase px-1">Breitengrad</p>
                <input 
                  type="number"
                  step="0.000001"
                  className="w-full bg-background-dark border border-border-dark rounded-xl h-10 px-3 text-xs text-white/70 outline-none focus:ring-1 ring-primary/50"
                  value={formData.location?.lat}
                  onChange={e => updateLocation(parseFloat(e.target.value), formData.location!.lng)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-text-secondary uppercase px-1">Längengrad</p>
                <input 
                  type="number"
                  step="0.000001"
                  className="w-full bg-background-dark border border-border-dark rounded-xl h-10 px-3 text-xs text-white/70 outline-none focus:ring-1 ring-primary/50"
                  value={formData.location?.lng}
                  onChange={e => updateLocation(formData.location!.lat, parseFloat(e.target.value))}
                />
              </div>
            </div>

            {tree && (
              <button 
                onClick={() => onDelete(tree.id)}
                className="mt-6 w-full h-12 flex items-center justify-center gap-2 border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Diesen Baum löschen
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TreeForm;
