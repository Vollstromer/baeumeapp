import { createClient } from '@supabase/supabase-js';
import { Tree, Meadow } from '../types';

// Nutzt GitHub Secrets via process.env (VITE_ Präfix ist zwingend erforderlich)
// Fixed: Property 'env' does not exist on type 'ImportMeta' by using process.env
const SUPABASE_URL: string = (process.env as any).VITE_SUPABASE_URL || '';
// Fixed: Property 'env' does not exist on type 'ImportMeta' by using process.env
const SUPABASE_ANON_KEY: string = (process.env as any).VITE_SUPABASE_ANON_KEY || '';

const isConfigured = () => {
  return SUPABASE_URL && SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 50;
};

let supabaseInstance: any = null;

const loadSupabase = () => {
  if (!isConfigured()) {
    console.error("Supabase Konfiguration unvollständig.");
    return null;
  }
  
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  } catch (e) {
    console.error("Fehler beim Initialisieren des Supabase Clients:", e);
    return null;
  }
};

/**
 * Komprimiert ein Bild clientseitig und wandelt es in WebP um.
 */
const compressAndConvertToWebP = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas Context konnte nicht erstellt werden'));
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Kompression fehlgeschlagen'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const isTableMissingError = (error: any) => {
  return error && (
    error.code === 'PGRST116' || 
    error.code === '42P01' || 
    (error.message && error.message.includes('Could not find the table'))
  );
};

export const db = {
  isConfigured,

  async getSupabase() {
    return loadSupabase();
  },

  async uploadImage(file: File): Promise<string | null> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Keine aktive Sitzung für den Upload.");
        return null;
      }

      const optimizedBlob = await compressAndConvertToWebP(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
      const filePath = `trees/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tree-images')
        .upload(filePath, optimizedBlob, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage-RLS-Fehler beim Hochladen:', uploadError.message);
        return null;
      }

      const { data } = supabase.storage
        .from('tree-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Kritische Bild-Upload Exception:', error);
      return null;
    }
  },

  async getTrees(): Promise<{data: Tree[], error?: string, tablesMissing?: boolean}> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return { data: [] };

      const { data, error } = await supabase
        .from('trees')
        .select('*');

      if (error) {
        return { 
          data: [], 
          error: error.message, 
          tablesMissing: isTableMissingError(error) 
        };
      }
      return { data: data || [] };
    } catch (error) {
      return { data: [], error: 'Netzwerkfehler' };
    }
  },

  async upsertTree(tree: Tree): Promise<boolean> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return true;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const dataToSave = {
        ...tree,
        user_id: session.user.id
      };

      const { error } = await supabase.from('trees').upsert(dataToSave);
      return !error;
    } catch (error) {
      return false;
    }
  },

  async deleteTree(id: string): Promise<boolean> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return true;
      const { error } = await supabase.from('trees').delete().eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  },

  async getMeadows(): Promise<{data: Meadow[], error?: string, tablesMissing?: boolean}> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return { data: [] };

      const { data, error } = await supabase
        .from('meadows')
        .select('*');

      if (error) {
        return { 
          data: [], 
          error: error.message, 
          tablesMissing: isTableMissingError(error) 
        };
      }
      return { data: data || [] };
    } catch (error) {
      return { data: [], error: 'Netzwerkfehler' };
    }
  },

  async upsertMeadow(meadow: Meadow): Promise<boolean> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const dataToSave = {
        ...meadow,
        user_id: session.user.id
      };

      const { error } = await supabase.from('meadows').upsert(dataToSave);
      return !error;
    } catch (error) {
      return false;
    }
  },

  async deleteMeadow(id: string): Promise<boolean> {
    try {
      const supabase = loadSupabase();
      if (!supabase) return true;
      const { error } = await supabase.from('meadows').delete().eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  }
};
