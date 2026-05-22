import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, CheckCircle, Printer } from 'lucide-react';
import { formatCOP } from '../utils/format';

const CATEGORY_EMOJI = {
  'Patacones': '🥔', 'Sandwich': '🥪', 'Perros Calientes': '🌭',
  'Chuzos': '🍢', 'Desgranados': '🌽', 'Hamburguesas': '🍔',
  'Salchipapas': '🍟', 'Extras': '✨',
};

export default function POS() {
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [activeCat, setActiveCat]         = useState(null);
  const [search, setSearch]               = useState('');
  const [cart, setCart]                   = useState([]);
  const [showCart, setShowCart]           = useState(false);
  const [showPayment, setShowPayment]     = useState(false);
  const [payMethod, setPayMethod]         = useState('efectivo');
  const [cashInput, setCashInput]         = useState('');
  const [processing, setProcessing]       = useState(false);
  const [successSale, setSuccessSale]     = useState(null);

  const fetchProducts = useCallback(async () => {
    const p = new URLSearchParams();
    if (search)    p.set('q', search);
    if (activeCat) p.set('category_id', activeCat);
    const res = await fetch(`/api/products?${p}`);
    setProducts(await res.json());
  }, [search, activeCat]);

  useEffect(() => { fetch('/api/products/categories').then(r => r.json()).then(setCategories); }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (product) => {
    if (product.stock === 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1,
      }];
    });
  };

  const updateQty = (product_id, delta) => {
    setCart(prev =>
      prev.map(i => i.product_id === product_id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (product_id) => setCart(prev => prev.filter(i => i.product_id !== product_id));
  const clearCart  = () => { setCart([]); setCashInput(''); setPayMethod('efectivo'); };

  // Ctrl+P prints the receipt while the success modal is open
  useEffect(() => {
    if (!successSale) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [successSale]);

  const cartTotal  = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount  = cart.reduce((s, i) => s + i.quantity, 0);
  const cashAmount = cashInput ? parseFloat(cashInput) : 0;
  const change     = cashAmount - cartTotal;

  const completeSale = async () => {
    if (!cart.length) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          payment_method: payMethod,
          cash_received: payMethod === 'efectivo' && cashInput ? cashAmount : null,
        }),
      });
      const sale = await res.json();
      const saleItems = cart.map(i => ({ ...i }));
      const cashReceived = payMethod === 'efectivo' && cashInput ? cashAmount : null;
      setSuccessSale({ ...sale, change: change > 0 ? change : 0, itemCount: cartCount, items: saleItems, cashReceived });
      clearCart();
      setShowPayment(false);
      setShowCart(false);
      fetchProducts();
    } catch {
      alert('Error al procesar la venta. Verifica la conexión.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-112px)]">

      {/* ── Success Modal ─────────────────────────────── */}
      {successSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={56} />
            <h2 className="text-xl font-bold text-gray-800 mb-1">¡Venta Exitosa!</h2>
            <p className="text-gray-400 text-sm mb-4">Venta #{successSale.id}</p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-5">
              <Row label="Total"    value={formatCOP(successSale.total)} bold />
              <Row label="Productos" value={successSale.itemCount} />
              <Row label="Pago"     value={successSale.payment_method} capitalize />
              {successSale.change > 0 && (
                <Row label="Cambio" value={formatCOP(successSale.change)} green />
              )}
            </div>
            <button
              onClick={() => window.print()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-bold transition-colors flex items-center justify-center gap-2 mb-2"
            >
              <Printer size={18} /> Imprimir Recibo
            </button>
            <button
              onClick={() => setSuccessSale(null)}
              className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl py-3 font-bold transition-colors"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      )}

      {/* Receipt — off-screen on screen, shown only when printing */}
      <Receipt sale={successSale} />

      {/* ── Left: Products ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search + category filter */}
        <div className="p-3 bg-white border-b space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <CatBtn active={!activeCat} onClick={() => setActiveCat(null)}>Todos</CatBtn>
            {categories.map(c => (
              <CatBtn key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}>
                {c.name}
              </CatBtn>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-auto p-3">
          {products.length === 0 ? (
            <p className="text-center text-gray-400 mt-12">No se encontraron productos</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {products.map(product => {
                const inCart = cart.find(i => i.product_id === product.id);
                const outOfStock = product.stock === 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`relative bg-white rounded-xl p-3 text-left shadow-sm border-2 transition-all active:scale-95
                      ${inCart ? 'border-brand-blue shadow-md' : 'border-transparent'}
                      ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 bg-brand-blue text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold z-10">
                        {inCart.quantity}
                      </span>
                    )}
                    {product.stock > 0 && product.stock < 5 && (
                      <span className="absolute top-1.5 left-1.5 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                        ¡{product.stock}!
                      </span>
                    )}
                    <div className="w-full aspect-square bg-brand-yellow-light rounded-lg flex items-center justify-center mb-2 text-3xl">
                      {CATEGORY_EMOJI[product.category_name] || '🍽️'}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-sm font-bold text-brand-blue">{formatCOP(product.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop Cart ──────────────────────────────── */}
      <div className="hidden lg:flex w-80 flex-col bg-white border-l shadow-inner">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={18} /> Carrito
            {cartCount > 0 && <span className="ml-auto bg-brand-blue text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>}
          </h2>
        </div>
        <CartContent
          cart={cart} cartTotal={cartTotal}
          onUpdateQty={updateQty} onRemove={removeItem}
          onCheckout={() => setShowPayment(true)}
        />
      </div>

      {/* ── Mobile cart FAB ───────────────────────────── */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-20 right-4 bg-brand-blue text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl z-20"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {cartCount}
          </span>
        </button>
      )}

      {/* ── Mobile Cart Drawer ────────────────────────── */}
      {showCart && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-bold text-lg">Carrito ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>
            <CartContent
              cart={cart} cartTotal={cartTotal}
              onUpdateQty={updateQty} onRemove={removeItem}
              onCheckout={() => { setShowCart(false); setShowPayment(true); }}
            />
          </div>
        </div>
      )}

      {/* ── Payment Modal ─────────────────────────────── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">Cobrar</h2>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>

            <div className="bg-brand-blue-light rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-brand-blue mb-1">
                <span>{cartCount} producto(s)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-blue text-lg">Total</span>
                <span className="font-black text-brand-blue text-2xl">{formatCOP(cartTotal)}</span>
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-600 mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { key: 'efectivo',     label: '💵 Efectivo'    },
                { key: 'tarjeta',      label: '💳 Tarjeta'     },
                { key: 'transferencia',label: '📱 Transfer'    },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    payMethod === m.key
                      ? 'border-brand-blue bg-brand-blue-light text-brand-blue'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {payMethod === 'efectivo' && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 block mb-1.5">
                  Dinero recibido
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej: 20000"
                  value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl focus:outline-none focus:border-brand-blue"
                />
                {cashInput && (
                  <div className={`mt-2 text-center text-lg font-bold rounded-xl py-2 ${
                    change >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                  }`}>
                    {change >= 0 ? `Cambio: ${formatCOP(change)}` : `Falta: ${formatCOP(Math.abs(change))}`}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={completeSale}
              disabled={processing || (payMethod === 'efectivo' && cashInput && change < 0)}
              className="w-full bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-4 font-bold text-lg transition-colors"
            >
              {processing ? 'Procesando...' : `Cobrar ${formatCOP(cartTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartContent({ cart, cartTotal, onUpdateQty, onRemove, onCheckout }) {
  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        {cart.length === 0 ? (
          <div className="text-center text-gray-300 mt-12">
            <ShoppingCart size={52} className="mx-auto mb-3" />
            <p className="text-sm">Agrega productos al carrito</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.product_id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-400">{formatCOP(item.price)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.product_id, -1)}
                    className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.product_id, 1)}
                    className="w-7 h-7 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="text-right flex-shrink-0 w-16">
                  <p className="text-sm font-bold text-gray-800">{formatCOP(item.price * item.quantity)}</p>
                </div>
                <button
                  onClick={() => onRemove(item.product_id)}
                  className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-white">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-gray-700">Total</span>
          <span className="font-black text-xl text-brand-blue">{formatCOP(cartTotal)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-40 text-white rounded-xl py-3.5 font-bold text-base transition-colors"
        >
          Cobrar
        </button>
      </div>
    </>
  );
}

function CatBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value, bold, green, capitalize }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${bold ? 'text-gray-800' : ''} ${green ? 'text-green-600' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}

const SEP = '─'.repeat(32);

function Receipt({ sale }) {
  if (!sale) return null;
  const dt = new Date();
  const dateStr = dt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const s = { display: 'flex', justifyContent: 'space-between', marginBottom: '2px' };
  return (
    <div className="receipt-print-only" aria-hidden="true">
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>T'RRAZA EN CASA</div>
        <div>Villanueva, La Guajira</div>
        <div style={{ marginTop: '4px' }}>{SEP}</div>
      </div>

      <div style={{ marginBottom: '6px' }}>
        <div>Fecha: {dateStr}  {timeStr}</div>
        <div>Venta #: {sale.id}</div>
        <div>{SEP}</div>
      </div>

      <div style={{ marginBottom: '6px' }}>
        {sale.items?.map((item, i) => {
          const name = item.product_name.length > 18
            ? item.product_name.slice(0, 17) + '…'
            : item.product_name;
          return (
            <div key={i}>
              <div style={{ fontWeight: 'bold' }}>{name}</div>
              <div style={s}>
                <span>  x{item.quantity}  @  {formatCOP(item.price)}</span>
                <span>{formatCOP(item.price * item.quantity)}</span>
              </div>
            </div>
          );
        })}
        <div>{SEP}</div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ ...s, fontWeight: 'bold', fontSize: '13px' }}>
          <span>TOTAL</span>
          <span>{formatCOP(sale.total)}</span>
        </div>
        <div style={s}>
          <span>Método de pago:</span>
          <span style={{ textTransform: 'capitalize' }}>{sale.payment_method}</span>
        </div>
        {sale.cashReceived != null && (
          <div style={s}>
            <span>Recibido:</span>
            <span>{formatCOP(sale.cashReceived)}</span>
          </div>
        )}
        {sale.change > 0 && (
          <div style={s}>
            <span>Cambio:</span>
            <span>{formatCOP(sale.change)}</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div>{SEP}</div>
        <div style={{ marginTop: '4px' }}>¡Gracias por su compra!</div>
        <div>{SEP}</div>
      </div>
    </div>
  );
}
