'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Package, Search, Filter, ChevronRight, Share2, Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { generateRoutine, getStockStatus } from '@/lib/recommendationEngine';

function RecomendacionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const baumannCode = searchParams.get('baumann') || '';
    const patientId = searchParams.get('patient_id');

    const [stock, setStock] = useState([]);
    const [routine, setRoutine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedAM, setExpandedAM] = useState(true);
    const [expandedPM, setExpandedPM] = useState(false);

    useEffect(() => {
        fetchStockAndGenerate();
    }, []);

    async function fetchStockAndGenerate() {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('pharmacy_products').select('*');
            if (error) console.error('Supabase query error:', error);
            const products = data || [];
            setStock(products);
            const routineResult = generateRoutine(baumannCode, products);
            setRoutine(routineResult);
        } catch (e) {
            console.error('Error loading recommendations:', e);
        } finally {
            setLoading(false);
        }
    }

    function handleShare() {
        if (!routine || !baumannCode) return;
        const amSteps = routine.steps.morning.map(s => `☀️ ${s.action}: ${s.product.name}`).join('\n');
        const pmSteps = routine.steps.night.map(s => `🌙 ${s.action}: ${s.product.name}`).join('\n');
        const text = `BeSkinPro — Pauta para tipo de piel ${baumannCode}\n\n✨ Rutina Mañana:\n${amSteps}\n\n🌙 Rutina Noche:\n${pmSteps}\n\nGenerado con BeSkinPro Mobile`;

        if (navigator.share) {
            navigator.share({ title: `Pauta BeSkinPro — ${baumannCode}`, text });
        } else {
            navigator.clipboard.writeText(text).then(() => alert('Pauta copiada al portapapeles'));
        }
    }

    if (loading) {
        return (
            <>
                <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generando recomendaciones...</p>
                    </div>
                </main>
                <BottomNav />
            </>
        );
    }

    return (
        <>
            <main className="page-content fade-in">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <h1 className="page-title">Recomendación</h1>
                            {baumannCode && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <span style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: 22, color: 'var(--accent)' }}>{baumannCode}</span>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tipo de piel detectado</span>
                                </div>
                            )}
                        </div>
                        <button onClick={handleShare} className="btn btn-outline btn-icon" title="Compartir pauta">
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Rutina AM */}
                <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
                    <button
                        onClick={() => setExpandedAM(v => !v)}
                        style={{ width: '100%', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Sun size={20} color="var(--warning)" />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Rutina de Mañana</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{routine?.steps.morning.length || 0} productos</div>
                            </div>
                        </div>
                        {expandedAM ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                    </button>
                    {expandedAM && routine?.steps.morning.map((step, i) => (
                        <ProductStep key={i} step={step} />
                    ))}
                    {expandedAM && (!routine?.steps.morning.length) && (
                        <div style={{ padding: '16px 20px', color: 'var(--text-subtle)', fontSize: 13 }}>Sin productos disponibles en stock para el turno de mañana</div>
                    )}
                </div>

                {/* Rutina PM */}
                <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
                    <button
                        onClick={() => setExpandedPM(v => !v)}
                        style={{ width: '100%', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Moon size={20} color="var(--accent)" />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Rutina de Noche</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{routine?.steps.night.length || 0} productos</div>
                            </div>
                        </div>
                        {expandedPM ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                    </button>
                    {expandedPM && routine?.steps.night.map((step, i) => (
                        <ProductStep key={i} step={step} />
                    ))}
                    {expandedPM && (!routine?.steps.night.length) && (
                        <div style={{ padding: '16px 20px', color: 'var(--text-subtle)', fontSize: 13, background: 'var(--bg-card)' }}>
                            No se han encontrado productos específicos en stock para el turno de noche.
                        </div>
                    )}
                </div>

                {/* Stock alert */}
                {routine && (!routine.stockStatus?.morning.isComplete || !routine.stockStatus?.night.isComplete) && (
                    <div style={{ padding: '14px 16px', background: 'var(--warning-dim)', borderRadius: 14, border: '1px solid rgba(240,165,0,0.3)', marginBottom: 16, fontSize: 13, color: 'var(--warning)', lineHeight: 1.5 }}>
                        ⚠️ {routine.stockStatus?.morning.total === 0 && routine.stockStatus?.night.total === 0
                            ? "No hay productos en stock que coincidan con tu tipo de piel. Se muestran recomendaciones generales."
                            : "Algunas categorías de productos no tienen stock disponible. La rutina puede estar incompleta."}
                    </div>
                )}

                {/* Nav to stock */}
                <button onClick={() => router.push('/stock')} className="btn btn-ghost btn-full" style={{ gap: 8, marginBottom: 80 }}>
                    <Package size={16} /> Ver todo el stock de la farmacia
                </button>

                <div className="sticky-cta">
                    <button className="btn btn-primary btn-full btn-lg" onClick={handleShare}>
                        <Share2 size={18} /> Enviar pauta al paciente
                    </button>
                </div>
            </main>
            <BottomNav />
        </>
    );
}

function ProductStep({ step }) {
    const status = getStockStatus(step.product.quantity);
    return (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                        {step.action}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.product.name}
                    </div>
                    {step.product.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                            {step.product.description.slice(0, 80)}{step.product.description.length > 80 ? '…' : ''}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, boxShadow: `0 0 6px ${status.color}` }} />
                            <span style={{ fontSize: 12, color: status.color, fontWeight: 600 }}>{status.label}</span>
                        </div>
                        {step.product.price && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {step.product.price}€</span>
                        )}
                    </div>
                </div>
                <span style={{ fontSize: 18 }}>{status.emoji}</span>
            </div>
        </div>
    );
}

export default function RecomendacionPage() {
    return (
        <Suspense fallback={<div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="spinner" /></div>}>
            <RecomendacionContent />
        </Suspense>
    );
}
