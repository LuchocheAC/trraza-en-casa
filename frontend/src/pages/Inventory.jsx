import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Package, X } from 'lucide-react';
import { formatCOP } from '../utils/format';

const EMPTY = { name: '', description: '', price: '', cost: '', stock: '', category_id: '', barcode: '', unit: 'unidad' };
const UNITS  = ['unidad', 'kg', 'g', 'litro', 'ml', 'caja', 'paquete', 'botella', 'par', 'cubeta', 'docena'];

export default function Inventory() {
  const [products,     setProducts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [lowOnly,      setLowOnly]      = useState(false);
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [delTarget,    setDelTarget]    = useState(null);
  const [saving,       setSaving]       = useState(false);

  const fetchAll = useCallback(async () => {
    const p = new URLSearchParams();
    if (search)          p.set('q', search);
    if (catFilter)       p.set('category_id', catFilter);
    if (lowOnly)         p.set('low_stock', 'true');
    const [prods, cats] = await Promise.all([
      fetch(`/api/products?${p}`).then(r => r.json()),
      fetch('/api/products/categories').then(r => r.json()),
    ]);
    setProducts(prods);
    setCategories(cats);
  }, [search, catFilter, lowOnly]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p)  => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: p.price, cost: p.cost || '',
              stock: p.stock, category_id: p.category_id || '', barcode: p.barcode || '', unit: p.unit || 'unidad' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, price: parseFloat(form.price), cost: parseFloat(form.cost) || 0,
                   stock: parseInt(form.stock) || 0, category_id: form.category_id || null };
    try {
      const res = await fetch(editing ? `/api/products/${editing.id}` : '/api/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Error al guardar'); return; }
      closeModal();
      fetchAll();
    } catch { alert('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await fetch(`/api/products/${delTarget.id}`, { method: 'DELETE' });
    setDelTarget(null);
    fetchAll();
  };

  const lowCount = products.filter(p => p.stock < 5).length;

  return (
    <div className="p-3 max-w-4xl mx-auto">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <Package className="text-brand-blue" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total productos</p>
            <p className="text-2xl font-black text-gray-800">{products.length}</p>
          </div>
        </div>
        <button
          onClick={() => setLowOnly(!lowOnly)}
          className={`rounded-xl p-3.5 shadow-sm flex items-center gap-3 transition-colors text-left ${
            lowOnly ? 'bg-orange-50 border-2 border-orange-300' : 'bg-white border-2 border-transparent'
          }`}
        >
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-orange-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Stock bajo</p>
            <p className={`text-2xl font-black ${lowCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{lowCount}</p>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Products List */}
      <div className="space-y-2 pb-24">
        {products.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-gray-800">{product.name}</span>
                  {product.category_name && (
                    <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full font-medium">
                      {product.category_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-brand-blue">{formatCOP(product.price)}</span>
                  <span className="text-xs text-gray-400">Costo: {formatCOP(product.cost)}</span>
                </div>
              </div>
              {/* Stock badge */}
              <div className="text-center min-w-[3rem]">
                <p className={`text-xl font-black leading-none ${
                  product.stock === 0 ? 'text-red-500' : product.stock < 5 ? 'text-orange-500' : 'text-green-600'
                }`}>
                  {product.stock}
                </p>
                <p className="text-xs text-gray-400">{product.unit}</p>
              </div>
              {/* Actions */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(product)}
                  className="w-9 h-9 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-xl flex items-center justify-center transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => setDelTarget(product)}
                  className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 bg-brand-blue hover:bg-brand-blue-dark text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors z-20"
      >
        <Plus size={28} />
      </button>

      {/* Product Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Nombre *" required>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className={INPUT} placeholder="Nombre del producto" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio venta *" required>
                  <input required type="number" min="0" step="any" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Precio costo">
                  <input type="number" min="0" step="any" value={form.cost}
                    onChange={e => setForm({ ...form, cost: e.target.value })} className={INPUT} placeholder="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock *" required>
                  <input required type="number" min="0" value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })} className={INPUT} placeholder="0" />
                </Field>
                <Field label="Unidad">
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={INPUT}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Categoría">
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={INPUT}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <Field label="Código de barras">
                <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                  className={INPUT} placeholder="Opcional" />
              </Field>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 border-2 border-gray-200 rounded-xl py-3 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-50 text-white rounded-xl py-3 font-bold transition-colors">
                  {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {delTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-2">¿Eliminar producto?</h3>
            <p className="text-gray-500 mb-5">
              Se eliminará <strong className="text-gray-800">{delTarget.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelTarget(null)}
                className="flex-1 border-2 border-gray-200 rounded-xl py-2.5 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-bold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue';

function Field({ label, children, required }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
