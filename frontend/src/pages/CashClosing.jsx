import { useState, useEffect, useCallback } from 'react';
import { Lock, CheckCircle, TrendingUp, Banknote, CreditCard, Smartphone, Hash, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCOP } from '../utils/format';

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateTime(str) {
  return new Date(str).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function CashClosing() {
  const [summary,   setSummary]   = useState(null);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [confirm,   setConfirm]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [notes,     setNotes]     = useState('');
  const [expanded,  setExpanded]  = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/cash-closings/summary').then(r => r.json());
    setSummary(data);
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    const data = await fetch('/api/cash-closings').then(r => r.json());
    // Exclude today — shown in the summary section
    const today = new Date().toISOString().split('T')[0];
    setHistory(data.filter(c => c.date !== today));
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchHistory();
  }, [fetchSummary, fetchHistory]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const res = await fetch('/api/cash-closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al cerrar caja');
        return;
      }
      setConfirm(false);
      setNotes('');
      await fetchSummary();
      await fetchHistory();
    } catch {
      alert('Error de conexión');
    } finally {
      setClosing(false);
    }
  };

  const isClosed = !!summary?.closing;

  return (
    <div className="p-3 max-w-xl mx-auto">

      {/* Today header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-bold text-gray-800 text-lg leading-tight">Cierre de Caja</h1>
          {summary && (
            <p className="text-xs text-gray-400 capitalize">{formatDate(summary.date)}</p>
          )}
        </div>
        <button
          onClick={() => { fetchSummary(); fetchHistory(); }}
          className="p-2 rounded-xl bg-white shadow-sm text-gray-400 hover:text-blue-600 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(n => <div key={n} className="bg-white rounded-2xl h-24 shadow-sm animate-pulse" />)}
        </div>
      ) : summary && (
        <>
          {/* Status badge */}
          {isClosed ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-3">
              <CheckCircle className="text-green-500 flex-shrink-0" size={22} />
              <div>
                <p className="font-bold text-green-700 text-sm">Caja cerrada</p>
                <p className="text-xs text-green-600">{formatDateTime(summary.closing.closed_at)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-3">
              <Lock className="text-amber-500 flex-shrink-0" size={20} />
              <p className="font-semibold text-amber-700 text-sm">Caja abierta — pendiente de cierre</p>
            </div>
          )}

          {/* Total card */}
          <div className="bg-blue-600 rounded-2xl p-4 mb-3 text-white shadow-md">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <TrendingUp size={16} />
              <span className="text-sm font-semibold">Total del día</span>
            </div>
            <p className="text-3xl font-black tracking-tight">{formatCOP(summary.total_sales)}</p>
            <div className="flex items-center gap-1.5 mt-1 opacity-75 text-sm">
              <Hash size={13} />
              <span>{summary.transaction_count} {summary.transaction_count === 1 ? 'transacción' : 'transacciones'}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <PayCard
              icon={<Banknote size={18} />}
              label="Efectivo"
              value={summary.cash_total}
              color="green"
            />
            <PayCard
              icon={<CreditCard size={18} />}
              label="Tarjeta"
              value={summary.card_total}
              color="blue"
            />
            <PayCard
              icon={<Smartphone size={18} />}
              label="Transfer."
              value={summary.transfer_total}
              color="purple"
            />
          </div>

          {/* Close action */}
          {!isClosed && (
            confirm ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-200 mb-4">
                <p className="font-bold text-gray-800 mb-3">¿Confirmar cierre de caja?</p>
                <textarea
                  rows={2}
                  placeholder="Notas opcionales (ej: novedad en caja)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirm(false); setNotes(''); }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={closing}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock size={15} />
                    {closing ? 'Cerrando...' : 'Sí, cerrar caja'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(true)}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 font-bold text-base transition-colors flex items-center justify-center gap-2 mb-4 shadow-sm"
              >
                <Lock size={18} /> Cerrar Caja
              </button>
            )
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-600 text-sm mb-2 px-1">Cierres anteriores</h2>
          <div className="space-y-2 pb-20">
            {history.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm capitalize">{formatDate(c.date)}</p>
                    <p className="text-xs text-gray-400">{c.transaction_count} transacciones · {formatDateTime(c.closed_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-black text-gray-800">{formatCOP(c.total_sales)}</span>
                    {expanded === c.id
                      ? <ChevronDown size={15} className="text-gray-300" />
                      : <ChevronRight size={15} className="text-gray-300" />
                    }
                  </div>
                </button>
                {expanded === c.id && (
                  <div className="border-t bg-gray-50 px-4 py-3 space-y-1.5">
                    <DetailRow label="💵 Efectivo"      value={formatCOP(c.cash_total)} />
                    <DetailRow label="💳 Tarjeta"       value={formatCOP(c.card_total)} />
                    <DetailRow label="📱 Transferencia" value={formatCOP(c.transfer_total)} />
                    {c.notes && (
                      <p className="text-xs text-gray-400 pt-1 border-t mt-1">
                        <span className="font-semibold">Notas:</span> {c.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PayCard({ icon, label, value, color }) {
  const colors = {
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="font-bold text-gray-800 text-sm leading-tight">{formatCOP(value)}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
