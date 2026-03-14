'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Filter, X, ChevronDown } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { getStockStatus } from '@/lib/recommendationEngine';

const CATEGORIES = ['Todos', 'limpiador', 'serum', 'hidratante', 'proteccion_solar', 'contorno_ojos', 'mascarilla'];

export default function StockPage() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todos');
    const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'disponible' | 'pocas' | 'agotado'
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        try {
            const { data } = await supabase.from('pharmacy_products').select('*').order('name');
            setProducts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handlePullRefresh() {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    }

    const filtered = products.filter(p => {
        const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === 'Todos' || p.category === category;
        const status = getStockStatus(p.quantity);
        const matchStatus = filterStatus === 'todos'
            || (filterStatus === 'disponible' && Number(p.quantity) > 3)
            || (filterStatus === 'pocas' && Number(p.quantity) > 0 && Number(p.quantity) <= 3)
            || (filterStatus === 'agotado' && Number(p.quantity) === 0);
        return matchSearch && matchCat && matchStatus;
    });

    const totalProducts = products.length;
    const outOfStock = products.filter(p => Number(p.quantity) === 0).length;
    const lowStock = products.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= 3).length;

    return (
        <>
            <main className="page-content fade-in">
                <div className="page-header">
                    <h1 className="page-title">Stock</h1>
                    <p className="page-subtitle">Consulta el inventario en tiempo real</p>
                </div>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                    {[
                        { label: 'Total', value: totalProducts, color: 'var(--text-muted)' },
                        { label: 'Pocas uds.', value: lowStock, color: 'var(--warning)' },
                        { label: 'Agotado', value: outOfStock, color: 'var(--danger)' },
                    ].map(card => (
                        <div key={card.label} className="card" style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: 22, color: card.color }}>{card.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'Figtree, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{card.label}</div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="input-wrapper" style={{ marginBottom: 12 }}>
                    <div className="input-icon-left"><Search size={18} /></div>
                    <input type="text" className="input-field" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Category filter */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
                    {CATEGORIES.map(cat => (
                        <button key={cat} className={`chip${category === cat ? ' selected' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setCategory(cat)}>
                            {cat === 'proteccion_solar' ? 'Solar' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'disponible', label: '✅ OK' },
                        { id: 'pocas', label: '⚠️ Pocas' },
                        { id: 'agotado', label: '❌ Agotado' },
                    ].map(f => (
                        <button key={f.id} className={`chip${filterStatus === f.id ? ' selected' : ''}`} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilterStatus(f.id)}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Refresh button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="section-title">{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</span>
                    <button onClick={handlePullRefresh} className="btn btn-ghost btn-sm" disabled={refreshing} style={{ gap: 4 }}>
                        {refreshing ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '↻'} Actualizar
                    </button>
                </div>

                {/* Products list */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--text-subtle)', fontSize: 14 }}>Cargando stock...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                        <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.3, color: 'var(--text-muted)' }} />
                        <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 600, color: 'var(--text-muted)' }}>Sin productos</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(product => {
                            const status = getStockStatus(product.quantity);
                            const isSelected = selected?.id === product.id;
                            return (
                                <div key={product.id} className="card" style={{ overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setSelected(isSelected ? null : product)}
                                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}
                                    >
                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                                            {status.emoji}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {product.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', fontFamily: 'Figtree, sans-serif', fontWeight: 700 }}>
                                                    {product.category?.replace(/_/g, ' ')}
                                                </span>
                                                {product.price && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>· {product.price}€</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                            <span style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: 18, color: status.color }}>
                                                {product.quantity}
                                            </span>
                                            <span style={{ fontSize: 10, color: status.color, fontWeight: 600 }}>uds.</span>
                                        </div>
                                    </button>

                                    {/* Expandable detail */}
                                    {isSelected && (
                                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }} className="fade-in">
                                            {product.description && (
                                                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 12 }}>{product.description}</p>
                                            )}
                                            {product.active_ingredients && (
                                                <div style={{ marginTop: 10 }}>
                                                    <div style={{ fontSize: 11, fontFamily: 'Figtree, sans-serif', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-subtle)', letterSpacing: '0.08em', marginBottom: 4 }}>
                                                        Principios activos
                                                    </div>
                                                    <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{product.active_ingredients}</p>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
                                                <span style={{ fontSize: 13, color: status.color, fontWeight: 600 }}>{status.label}</span>
                                                <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>— {product.quantity} unidades en stock</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Read-only notice */}
                <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>
                    👁️ Solo lectura en mobile. Para gestionar el stock, usa la versión de escritorio BeSkinPro.
                </div>
            </main>
            <BottomNav />
        </>
    );
}
