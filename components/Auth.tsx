
import React, { useState } from 'react';
import { db } from '../lib/database';

interface AuthProps {
  onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = await db.getSupabase();
    if (!supabase) {
      setError("Datenbank konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      onSuccess();
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" 
        ? "Zugangsdaten ungültig oder Account existiert nicht." 
        : err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-20 bg-primary/10 border border-primary/20 rounded-3xl text-primary mb-6 shadow-2xl">
            <span className="material-symbols-outlined text-5xl">park</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Bäumeliste</h1>
        </div>

        <div className="bg-surface-dark border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-shake">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">Email Adresse</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary">mail</span>
                <input 
                  type="email" 
                  required
                  placeholder="name@beispiel.de"
                  className="w-full h-14 bg-background-dark border border-white/5 rounded-2xl pl-12 pr-4 text-white focus:ring-2 ring-primary/50 outline-none transition-all placeholder:text-white/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">Passwort</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary">lock</span>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full h-14 bg-background-dark border border-white/5 rounded-2xl pl-12 pr-4 text-white focus:ring-2 ring-primary/50 outline-none transition-all placeholder:text-white/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-primary text-background-dark font-black rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="size-5 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Anmelden</span>
                  <span className="material-symbols-outlined">login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Auth;
