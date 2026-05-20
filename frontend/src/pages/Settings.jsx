import { useState, useEffect } from 'react';
import { User, KeyRound, Shield, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS = {
  admin:  'bg-purple-100 text-purple-700',
  cajero: 'bg-blue-100 text-blue-700',
};

export default function Settings() {
  const { user: me } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [expanded,   setExpanded]   = useState(null);
  const [passwords,  setPasswords]  = useState({});
  const [saving,     setSaving]     = useState(null);
  const [saved,      setSaved]      = useState(null);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    if (me?.role === 'admin') {
      fetch('/api/auth/users').then(r => r.json()).then(setUsers);
    } else {
      setUsers([{ id: me.id, username: me.username, role: me.role }]);
    }
  }, [me]);

  const handleChangePassword = async (userId) => {
    const pw = passwords[userId] || '';
    if (pw.length < 6) {
      setErrors(e => ({ ...e, [userId]: 'Mínimo 6 caracteres' }));
      return;
    }
    setSaving(userId);
    setErrors(e => ({ ...e, [userId]: '' }));
    try {
      const res = await fetch(`/api/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrors(e => ({ ...e, [userId]: d.error }));
        return;
      }
      setPasswords(p => ({ ...p, [userId]: '' }));
      setSaved(userId);
      setTimeout(() => setSaved(null), 2500);
    } catch {
      setErrors(e => ({ ...e, [userId]: 'Error de conexión' }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-3 max-w-xl mx-auto">
      <div className="mb-4">
        <h1 className="font-bold text-gray-800 text-lg">Configuración</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {me?.role === 'admin' ? 'Gestión de usuarios y contraseñas' : 'Cambiar mi contraseña'}
        </p>
      </div>

      {/* Logged-in user info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-800">{me?.username}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${ROLE_COLORS[me?.role]}`}>
            {me?.role === 'admin' ? 'Administrador' : 'Cajero'}
          </span>
        </div>
      </div>

      {/* Users list */}
      <h2 className="text-sm font-bold text-gray-600 mb-2 px-1">
        {me?.role === 'admin' ? 'Usuarios del sistema' : 'Mi cuenta'}
      </h2>
      <div className="space-y-2 pb-20">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === u.id ? null : u.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${u.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                {u.role === 'admin' ? <Shield size={16} className="text-purple-600" /> : <User size={16} className="text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{u.username}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role]}`}>
                  {u.role === 'admin' ? 'Administrador' : 'Cajero'}
                </span>
              </div>
              <KeyRound size={15} className="text-gray-300 flex-shrink-0" />
              {expanded === u.id
                ? <ChevronDown size={15} className="text-gray-300" />
                : <ChevronRight size={15} className="text-gray-300" />
              }
            </button>

            {expanded === u.id && (
              <div className="border-t bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Nueva contraseña</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={passwords[u.id] || ''}
                    onChange={e => setPasswords(p => ({ ...p, [u.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleChangePassword(u.id)}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleChangePassword(u.id)}
                    disabled={saving === u.id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
                  >
                    {saving === u.id ? '...' : saved === u.id
                      ? <><CheckCircle size={15} /> OK</>
                      : 'Guardar'
                    }
                  </button>
                </div>
                {errors[u.id] && (
                  <p className="text-red-500 text-xs mt-1.5">{errors[u.id]}</p>
                )}
                {saved === u.id && (
                  <p className="text-green-600 text-xs mt-1.5 font-medium">¡Contraseña actualizada!</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
