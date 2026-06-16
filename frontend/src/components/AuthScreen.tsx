import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, teamName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-3xl text-black shadow-lg shadow-amber-500/25 mb-4">
            DT
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Gran DT <span className="text-gradient-gold">26</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Fantasy del Mundial 2026</p>
        </div>

        <div className="glass-gold rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-2 mb-6 p-1 bg-black/30 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  Nombre de tu equipo
                </label>
                <input
                  className="input-field"
                  placeholder="Ej: Los Campeones"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Contraseña</label>
              <input
                className="input-field"
                type="password"
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 6 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mode === 'login' ? (
                <>
                  <LogIn size={18} /> {submitting ? 'Ingresando...' : 'Ingresar'}
                </>
              ) : (
                <>
                  <UserPlus size={18} /> {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
