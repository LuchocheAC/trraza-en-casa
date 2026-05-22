import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, BarChart2, Lock, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_NAV = [
  { to: '/pos',       icon: ShoppingCart, label: 'Ventas'     },
  { to: '/inventory', icon: Package,      label: 'Inventario' },
  { to: '/sales',     icon: BarChart2,    label: 'Historial'  },
  { to: '/cash',      icon: Lock,         label: 'Caja'       },
  { to: '/settings',  icon: Settings,     label: 'Config.'    },
];

const CAJERO_NAV = [
  { to: '/pos', icon: ShoppingCart, label: 'Ventas' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const nav = user?.role === 'admin' ? ADMIN_NAV : CAJERO_NAV;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-brand-blue text-white px-4 py-3 shadow-lg flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <ShoppingCart size={22} />
          <span className="font-bold text-lg tracking-tight">T'rraza en Casa</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{user?.username}</p>
            <p className="text-xs text-brand-blue-muted capitalize leading-tight">
              {user?.role === 'admin' ? 'Administrador' : 'Cajero'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-lg">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 transition-colors ${
                isActive ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-xs mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
