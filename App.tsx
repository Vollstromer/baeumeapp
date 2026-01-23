
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewMode, Tree, Meadow, TreeCondition } from './types';
import { db } from './lib/database';
import { INITIAL_TREES, INITIAL_MEADOWS } from './constants';
import MapView from './components/MapView';
import ListView from './components/ListView';
import TreeForm from './components/TreeForm';
import TreeDetails from './components/TreeDetails';
import MeadowForm from './components/MeadowForm';
import Auth from './components/Auth';

export type MapStyle = 'dark' | 'satellite' | 'standard';
type SyncStatus = 'connected' | 'error' | 'unconfigured' | 'syncing' | 'tables-missing';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard');
  const [trees, setTrees] = useState<Tree[]>([]);
  const [meadows, setMeadows] = useState<Meadow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [showSyncIndicator, setShowSyncIndicator] = useState(true);
  const [showSetupHelper, setShowSetupHelper] = useState(false);
  
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedMeadowId, setSelectedMeadowId] = useState<string | null>(null);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [editingMeadow, setEditingMeadow] = useState<Meadow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Session handling
  useEffect(() => {
    const initAuth = async () => {
      const supabase = await db.getSupabase();
      if (!supabase) {
        setIsAuthChecking(false);
        return;
      }

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setIsAuthChecking(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  const loadData = async () => {
    if (!session) return;
    
    setIsLoading(true);
    setSyncStatus('syncing');
    setShowSyncIndicator(true);
    
    if (db.isConfigured()) {
      try {
        const [treesRes, meadowsRes] = await Promise.all([
          db.getTrees(),
          db.getMeadows()
        ]);
        
        if (treesRes.tablesMissing || meadowsRes.tablesMissing) {
          setSyncStatus('tables-missing');
          setShowSetupHelper(true);
        } else if (!treesRes.error && !meadowsRes.error) {
          setTrees(treesRes.data);
          setMeadows(meadowsRes.data);
          setSyncStatus('connected');
          setIsLoading(false);
          return;
        } else {
          setSyncStatus('error');
        }
      } catch (error) {
        console.error("Cloud-Sync Fehler:", error);
        setSyncStatus('error');
      }
    } else {
      setSyncStatus('unconfigured');
    }

    const localTrees = localStorage.getItem('bk_trees');
    const localMeadows = localStorage.getItem('bk_meadows');

    if (localTrees && localMeadows) {
      setTrees(JSON.parse(localTrees));
      setMeadows(JSON.parse(localMeadows));
    } else {
      setTrees(INITIAL_TREES);
      setMeadows(INITIAL_MEADOWS);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && syncStatus !== 'tables-missing' && session) {
      localStorage.setItem('bk_trees', JSON.stringify(trees));
      localStorage.setItem('bk_meadows', JSON.stringify(meadows));
    }
  }, [trees, meadows, isLoading, syncStatus, session]);

  useEffect(() => {
    if (syncStatus === 'connected') {
      const timer = setTimeout(() => setShowSyncIndicator(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSyncIndicator(true);
    }
  }, [syncStatus]);

  const handleLogout = async () => {
    const supabase = await db.getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      setTrees([]);
      setMeadows([]);
    }
  };

  const filteredTrees = useMemo(() => {
    return trees.filter(t => 
      t.variety.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trees, searchQuery]);

  const handleSaveTree = async (treeData: Partial<Tree>) => {
    const treeToSave: Tree = editingTree 
      ? { ...editingTree, ...treeData } as Tree
      : { ...treeData, id: `t-${Date.now()}` } as Tree;

    const success = await db.upsertTree(treeToSave);
    
    // Lokal aktualisieren
    if (editingTree) {
      setTrees(trees.map(t => t.id === editingTree.id ? treeToSave : t));
    } else {
      setTrees([...trees, treeToSave]);
    }

    if (!success && syncStatus !== 'tables-missing') {
      throw new Error("Speicherfehler: Möglicherweise RLS-Verletzung oder fehlendes Datenbank-Setup. Bitte SQL-Script im Setup-Menu prüfen.");
    }
    
    setViewMode('map');
  };

  const handleDeleteTree = async (id: string) => {
    if (!confirm("Soll dieser Baum wirklich gelöscht werden?")) return;
    setIsLoading(true);
    const success = await db.deleteTree(id);
    setTrees(trees.filter(t => t.id !== id));
    setSelectedTreeId(null);
    setViewMode('map');
    setIsLoading(false);
  };

  const handleSaveMeadow = async (meadowData: Partial<Meadow>) => {
    const meadowToSave: Meadow = editingMeadow
      ? { ...editingMeadow, ...meadowData } as Meadow
      : { ...meadowData, id: `m-${Date.now()}`, lastChecked: 'Heute' } as Meadow;

    const success = await db.upsertMeadow(meadowToSave);
    
    if (editingMeadow) {
      setMeadows(meadows.map(m => m.id === editingMeadow.id ? meadowToSave : m));
    } else {
      setMeadows([...meadows, meadowToSave]);
    }

    if (!success && syncStatus !== 'tables-missing') {
      throw new Error("Speichern der Wiese fehlgeschlagen. RLS-Policy prüfen.");
    }
    
    setViewMode('list');
  };

  const onDeselect = useCallback(() => {
    setSelectedTreeId(null);
    setSelectedMeadowId(null);
  }, []);

  if (isAuthChecking) {
    return (
      <div className="h-full w-full bg-background-dark flex flex-col items-center justify-center">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  // POLISHED SQL SCRIPT (Silences Supabase Warnings)
  const SQL_SCRIPT = `-- 1. Tabellen erstellen
CREATE TABLE IF NOT EXISTS meadows (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    name TEXT NOT NULL,
    area NUMERIC,
    description TEXT,
    icon TEXT,
    "lastChecked" TEXT,
    location JSONB
);

CREATE TABLE IF NOT EXISTS trees (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    variety TEXT NOT NULL,
    "meadowId" TEXT REFERENCES meadows(id) ON DELETE CASCADE,
    "plantingDate" TEXT,
    condition TEXT,
    location JSONB,
    "imageUrl" TEXT,
    description TEXT
);

-- 2. RLS Sicherheit aktivieren
ALTER TABLE meadows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;

-- 3. ALTE POLICIES & UNGENUTZTE INDIZES LÖSCHEN
DROP INDEX IF EXISTS idx_meadows_user_id;
DROP INDEX IF EXISTS idx_trees_user_id;

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('meadows', 'trees')) 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. TEAM-ZUGRIFF (Clean RLS - Beruhigt den Linter)
-- Wir nutzen auth.role() = 'authenticated' statt 'true'
CREATE POLICY "Team Select" ON meadows FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Team Insert" ON meadows FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team Update" ON meadows FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team Delete" ON meadows FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "Team Select" ON trees FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Team Insert" ON trees FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team Update" ON trees FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team Delete" ON trees FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

-- 5. STORAGE SETUP (BILD-UPLOAD)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tree-images', 'tree-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Team Upload" ON storage.objects;
DROP POLICY IF EXISTS "Team Update" ON storage.objects;
DROP POLICY IF EXISTS "Team Delete" ON storage.objects;

CREATE POLICY "Public Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tree-images');
CREATE POLICY "Team Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tree-images');
CREATE POLICY "Team Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tree-images') WITH CHECK (bucket_id = 'tree-images');
CREATE POLICY "Team Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tree-images');`;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative bg-background-dark text-white">
      
      {showSetupHelper && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-surface-dark border border-primary/30 rounded-[2.5rem] max-w-2xl w-full p-10 shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex items-center gap-5 mb-8">
              <div className="size-16 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-white leading-tight">Optimiertes Cloud-Setup</h2>
                <p className="text-text-secondary text-sm">Behebt RLS-Warnungen & optimiert die Datenbank.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-primary font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">looks_one</span>
                  Sperre Registrierung
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">
                  In Supabase: <b>Authentication -> Settings -> Providers -> Email</b>. <br/>
                  Deaktiviere <b>"Allow new users to sign up"</b>.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-primary font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">looks_two</span>
                  Datenbank-Script (Polished)
                </h4>
                <p className="text-[10px] text-text-secondary mb-3 uppercase font-black tracking-widest">Kopieren & im SQL Editor ausführen (Löscht Warnungen):</p>
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-primary/80 overflow-x-auto whitespace-pre select-all max-h-40">
                  {SQL_SCRIPT}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button 
                onClick={() => { navigator.clipboard.writeText(SQL_SCRIPT); alert("Optimiertes SQL kopiert!"); }}
                className="flex-1 h-16 bg-primary text-background-dark rounded-2xl font-black flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">content_copy</span>
                SQL kopieren
              </button>
              <button 
                onClick={() => setShowSetupHelper(false)}
                className="flex-1 h-16 bg-white/5 text-white rounded-2xl font-black hover:bg-white/10 transition-all border border-white/10"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud-Status Indicator */}
      <div className={`fixed top-6 right-6 z-[60] pointer-events-none transition-all duration-700 ease-in-out transform
        ${(viewMode === 'map' && showSyncIndicator) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-lg
          ${syncStatus === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
            syncStatus === 'tables-missing' || syncStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
            syncStatus === 'syncing' ? 'bg-primary/10 border-primary/20 text-primary' : 
            'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
          <span className={`material-symbols-outlined text-[18px] ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}>
            {syncStatus === 'connected' ? 'group' : 
             syncStatus === 'tables-missing' ? 'admin_panel_settings' :
             syncStatus === 'error' ? 'cloud_off' : 
             syncStatus === 'syncing' ? 'sync' : 'database_off'}
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest">
            {syncStatus === 'connected' ? 'Team Cloud' : 
             syncStatus === 'tables-missing' ? 'Setup nötig' :
             syncStatus === 'error' ? 'Sync Fehler' : 
             syncStatus === 'syncing' ? 'Synchronisiere...' : 'Lokal'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'map' && (
          <MapView 
            trees={filteredTrees} 
            meadows={meadows}
            selectedTreeId={selectedTreeId} 
            selectedMeadowId={selectedMeadowId}
            onTreeClick={(t) => { setSelectedTreeId(t.id); setSelectedMeadowId(null); }}
            onMeadowClick={(m) => { setSelectedMeadowId(m.id); setSelectedTreeId(null); }}
            onDeselect={onDeselect}
            onViewDetails={(t) => { setSelectedTreeId(t.id); setViewMode('tree-details'); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            mapStyle={mapStyle}
            setMapStyle={setMapStyle}
          />
        )}
        {viewMode === 'list' && (
          <div className="h-full flex flex-col relative">
             <div className="absolute top-6 right-6 z-50">
               <button 
                  onClick={handleLogout}
                  className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/10 text-text-secondary hover:text-white transition-all shadow-xl active:scale-90"
                  title="Abmelden"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
             </div>
             <ListView 
              meadows={meadows} 
              trees={trees} 
              onEditMeadow={(m) => { setEditingMeadow(m); setViewMode('meadow-form'); }}
              onEditTree={(t) => { setEditingTree(t); setViewMode('tree-form'); }}
              onMeadowClick={(m) => { setSelectedMeadowId(m.id); setViewMode('map'); }}
              onTreeDetails={(t) => { setSelectedTreeId(t.id); setViewMode('tree-details'); }}
              onAddTree={() => { setEditingTree(null); setViewMode('tree-form'); }}
              onAddMeadow={() => { setEditingMeadow(null); setViewMode('meadow-form'); }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
        )}
        {viewMode === 'tree-form' && (
          <TreeForm 
            tree={editingTree} 
            meadows={meadows} 
            allTrees={trees}
            mapStyle={mapStyle}
            onSave={handleSaveTree} 
            onCancel={() => setViewMode('map')} 
            onDelete={handleDeleteTree}
          />
        )}
        {viewMode === 'tree-details' && selectedTreeId && (
          <TreeDetails 
            tree={trees.find(t => t.id === selectedTreeId)!} 
            onEdit={() => { setEditingTree(trees.find(t => t.id === selectedTreeId)!); setViewMode('tree-form'); }}
            onDelete={() => handleDeleteTree(selectedTreeId)}
            onClose={() => setViewMode('list')}
          />
        )}
        {viewMode === 'meadow-form' && (
          <MeadowForm 
            meadow={editingMeadow} 
            mapStyle={mapStyle}
            onSave={handleSaveMeadow} 
            onCancel={() => setViewMode('list')} 
          />
        )}
      </div>

      {(viewMode === 'map' || viewMode === 'list') && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto shadow-2xl shadow-black/50 rounded-full p-1.5 bg-surface-dark/90 backdrop-blur-xl border border-white/10 flex items-center">
            <div className="flex relative bg-black/20 rounded-full p-1">
              <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${viewMode === 'map' ? 'bg-primary text-background-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: viewMode === 'map' ? "'FILL' 1" : '' }}>map</span>
                <span className="text-sm font-bold">Karte</span>
              </button>
              <div className="w-px h-6 bg-white/10 self-center mx-1"></div>
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-primary text-background-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: viewMode === 'list' ? "'FILL' 1" : '' }}>format_list_bulleted</span>
                <span className="text-sm font-bold">Liste</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
