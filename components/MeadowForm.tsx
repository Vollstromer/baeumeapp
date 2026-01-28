import React, { useState, useEffect, useRef } from 'react';
import { Meadow } from '../types';
import { MapStyle } from '../App';

interface MeadowFormProps {
  meadow: Meadow | null;
  mapStyle: MapStyle;
  onSave: (meadow: Partial<Meadow>) => Promise<void>; // Rückgabe eines Promises für Fehlerhandling
  onCancel: () => void;
}

const MeadowForm: React.FC<MeadowFormProps> = ({ meadow, mapStyle, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Meadow>>(
    meadow || {
      name: '',
      area: 0,
      description: '',
      icon: 'sunny',
      location: { lat: 48.8854, lng: 9.5311 },
    }
  );

  const [error, setError] = useState<string | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const L = (window as any).L;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialLat = formData.location?.lat || 48.8854;
    const initialLng = formData.location?.lng || 9.5311;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    mapInstance.current = map;
    updateTileLayer(mapStyle);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      updateLocation(lat, lng);
    });

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      updateLocation(lat, lng);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const updateTileLayer = (style: MapStyle) => {
    const map = mapInstance.current;
    if (!map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let applyFilter = true;
    let maxNativeZoom = 19;

    switch (style) {
      case 'google-hybrid':
        url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        applyFilter = false;
        maxNativeZoom = 21;
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
      maxNativeZoom: maxNativeZoom
    }).addTo(map);
  };

  useEffect(() => {
    updateTileLayer(mapStyle);
  }, [mapStyle]);

  const updateLocation = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      location: { lat, lng }
    }));
    
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const handleSave = async () => {
    setError(null);
    
    if (!formData.name?.trim()) {
      setError("Der Name der Wiese darf nicht leer sein.");
      return;
    }
    
    const areaNum = Number(formData.area);
    if (isNaN(areaNum) || areaNum < 0) {
      setError("Bitte geben Sie eine gültige Zahl für die Fläche ein.");
      return;
    }

    setIsSaving(true);
    try {
      const finalData = {
        ...formData,
        area: areaNum
      };
      await onSave(finalData);
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler beim Speichern.");
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation wird von Ihrem Browser nicht unterstützt.");
      return;
    }
    setLoadingLoc(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateLocation(latitude, longitude);
        mapInstance.current?.flyTo([latitude, longitude], 17);
        setLoadingLoc(false);
      },
      (err) => {
        setLoadingLoc(false);
        setError("Standort konnte nicht ermittelt werden (Berechtigung?).");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="bg-background-dark h-full flex flex-col text-white animate-fade-in overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-dark px-4 md:px-10 py-4 bg-surface-dark sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          <div className="size-9 md:size-10 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
            <span className="material-symbols-outlined text-xl md:text-2xl">agriculture</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm md:text-base truncate">{meadow ? 'Wiese bearbeiten' : 'Wiese hinzufügen'}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`h-10 md:h-11 px-4 md:px-8 bg-primary text-background-dark rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 text-xs md:text-sm ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isSaving && <div className="size-3 md:size-4 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin"></div>}
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
          <button 
            onClick={onCancel}
            className="size-10 md:size-11 flex items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-7xl mx-auto w-full p-4 md:p-10">
          {error && (
            <div className="mb-6 md:mb-8 bg-red-500/10 border border-red-500/30 text-red-400 p-4 md:p-5 rounded-2xl flex items-center gap-3 md:gap-4 animate-shake">
              <span className="material-symbols-outlined size-9 md:size-10 flex items-center justify-center bg-red-500/20 rounded-xl shrink-0">warning</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[10px] md:text-xs uppercase tracking-wider">Fehler beim Speichern</p>
                <p className="text-xs md:text-sm opacity-90 truncate">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-6 space-y-6">
              <section className="bg-surface-dark rounded-3xl p-5 md:p-6 border border-border-dark shadow-xl">
                <h3 className="text-base md:text-lg font-bold mb-6 flex items-center gap-3">
                  <span className="size-7 md:size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                  </span>
                  Stammdaten
                </h3>
                
                <div className="space-y-4 md:space-y-5">
                  <div className="space-y-1.5 md:space-y-2">
                    <p className="text-xs md:text-sm font-medium text-text-secondary px-1">Name der Wiese</p>
                    <input 
                      className="w-full bg-background-dark border border-border-dark rounded-xl h-11 md:h-12 px-4 focus:ring-2 ring-primary/30 outline-none transition-all text-white text-sm md:text-base"
                      placeholder="z.B. Hinterm Stall"
                      value={formData.name}
                      onChange={e => { setError(null); setFormData({ ...formData, name: e.target.value }); }}
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <p className="text-xs md:text-sm font-medium text-text-secondary px-1">Fläche (in ha)</p>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full bg-background-dark border border-border-dark rounded-xl h-11 md:h-12 pl-4 pr-16 md:pr-20 focus:ring-2 ring-primary/30 outline-none text-white text-sm md:text-base"
                        placeholder="0.00"
                        value={formData.area || ''}
                        onChange={e => setFormData({ ...formData, area: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-[10px] md:text-xs font-bold pointer-events-none">HEKTAR</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <p className="text-xs md:text-sm font-medium text-text-secondary px-1">Kurzbeschreibung</p>
                    <textarea 
                      className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-white focus:ring-2 ring-primary/30 outline-none min-h-[100px] md:min-h-[120px] resize-none text-sm md:text-base"
                      placeholder="Zusätzliche Informationen zum Standort..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <section className="bg-surface-dark rounded-3xl p-5 md:p-6 border border-border-dark shadow-xl h-full flex flex-col">
                <h3 className="text-base md:text-lg font-bold mb-6 flex items-center gap-3">
                  <span className="size-7 md:size-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">map</span>
                  </span>
                  Zentrum markieren
                </h3>

                <button 
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={loadingLoc}
                  className="w-full h-11 md:h-12 flex items-center justify-center gap-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl font-bold hover:bg-secondary/20 transition-all mb-4 disabled:opacity-50 text-xs md:text-sm"
                >
                  <span className={`material-symbols-outlined text-lg ${loadingLoc ? 'animate-spin' : ''}`}>
                    {loadingLoc ? 'sync' : 'my_location'}
                  </span>
                  Position ermitteln
                </button>

                <div className="flex-1 min-h-[300px] md:min-h-[400px] relative rounded-2xl overflow-hidden border border-border-dark z-0 shadow-inner">
                  <div ref={mapRef} className="absolute inset-0 h-full w-full bg-[#101922]" />
                </div>
                
                <p className="mt-4 text-[10px] md:text-[11px] text-text-secondary italic text-center">
                  Ziehen Sie den Marker oder klicken Sie auf die Karte.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default MeadowForm;
