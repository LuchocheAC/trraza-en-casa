import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, TrendingUp, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { formatCOP } from '../utils/format';

const PAYMENT_COLORS = {
  efectivo:      'bg-green-100 text-green-700',
  tarjeta:       'bg-blue-100 text-blue-700',
  transferencia: 'bg-purple-100 text-purple-700',
};

const FILTERS = [
  { key: 'today', label: 'Hoy'      },
  { key: 'week',  label: '7 días'   },
  { key: 'month', label: 'Mes'      },
  { key: 'all',   label: 'Todas'    },
];

function getDateRange(filter) {
  const today = new Date().toISOString().split('T')[0];
  if (filter === 'today') return { date: today };
  if (filter === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return { start_date: d.toISOString().split('T')[0], end_date: today };
  }
  if (filter === 'month') {
    const d = new Date(); d.setDate(1);
    return { start_date: d.toISOString().split('T')[0], end_date: today };
  }
  return {};
}

function formatDateTime(str) {
  return new Date(str).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function SalesHistory() {
  const [sales,       setSales]       = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [filter,      setFilter]      = useState('today');
  const [expanded,    setExpanded]    = useState(null);
  const [details,     setDetails]     = useState({});
  const [loading,     setLoading]     = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ ...getDateRange(filter), limit: 200 });
    const data = await fetch(`/api/sales?${p}`).then(r => r.json());
    setSales(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetch('/api/reports/summary').then(r => r.json()).then(setSummary);
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      const d = await fetch(`/api/sales/${id}`).then(r => r.json());
      setDetails(prev => ({ ...prev, [id]: d }));
    }
  };

  const filterTotal = sales.reduce((s, v) => s + v.total, 0);

  return (
    <div className="p-3 max-w-4xl mx-auto">

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Hoy',        data: summary.today  },
            { label: 'Esta semana',data: summary.week   },
            { label: 'Este mes',   data: summary.month  },
          ].map(({ label, data }) => (
            <div key={label} className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
              <p className="font-black text-gray-800 text-sm leading-tight">{formatCOP(data.total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{data.count} ventas</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              filter === f.key ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-500 shadow-sm hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Period total bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700">
          <TrendingUp size={18} />
          <span className="font-semibold text-sm">{sales.length} {sales.length === 1 ? 'venta' : 'ventas'}</span>
        </div>
        <span className="font-black text-blue-800 text-lg">{formatCOP(filterTotal)}</span>
      </div>

      {/* Sales list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(n => (
            <div key={n} className="bg-white rounded-xl h-16 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center text-gray-300 py-16">
          <ShoppingBag size={56} className="mx-auto mb-3" />
          <p className="font-medium text-gray-400">No hay ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-2 pb-20">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(sale.id)}
                className="w-full p-3.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="text-blue-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800">Venta #{sale.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${PAYMENT_COLORS[sale.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                      {sale.payment_method}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Calendar size={11} />
                    <span>{formatDateTime(sale.created_at)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-gray-800">{formatCOP(sale.total)}</p>
                  {expanded === sale.id
                    ? <ChevronDown size={16} className="ml-auto text-gray-300 mt-0.5" />
                    : <ChevronRight size={16} className="ml-auto text-gray-300 mt-0.5" />
                  }
                </div>
              </button>

              {expanded === sale.id && details[sale.id] && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  <div className="space-y-1.5 mb-2">
                    {details[sale.id].items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-700 font-medium">{item.product_name}</span>
                          <span className="text-gray-400 ml-2 text-xs">× {item.quantity}</span>
                          <span className="text-gray-400 ml-1 text-xs">@ {formatCOP(item.price)}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{formatCOP(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Total</span>
                      <span className="text-blue-600">{formatCOP(details[sale.id].total)}</span>
                    </div>
                    {details[sale.id].cash_received && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Recibido</span>
                        <span>{formatCOP(details[sale.id].cash_received)}</span>
                      </div>
                    )}
                    {details[sale.id].change_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-semibold">
                        <span>Cambio</span>
                        <span>{formatCOP(details[sale.id].change_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
