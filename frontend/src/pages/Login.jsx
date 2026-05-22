import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/pos', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-blue flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="T'rraza en Casa" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">T'rraza en Casa</h1>
          <p className="text-gray-400 text-sm mt-1">Villanueva, La Guajira</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Usuario
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue transition-colors"
              placeholder="admin / cajero"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-blue transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-bold transition-colors mt-2"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>

      <p className="text-white/60 text-xs mt-6">Sistema POS · v1.0</p>
    </div>
  );
}
