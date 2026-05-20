import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import CashClosing from './pages/CashClosing';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos"       element={<POS />} />
            <Route path="inventory" element={<PrivateRoute adminOnly><Inventory /></PrivateRoute>} />
            <Route path="sales"     element={<PrivateRoute adminOnly><SalesHistory /></PrivateRoute>} />
            <Route path="cash"      element={<PrivateRoute adminOnly><CashClosing /></PrivateRoute>} />
            <Route path="settings"  element={<PrivateRoute adminOnly><Settings /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
