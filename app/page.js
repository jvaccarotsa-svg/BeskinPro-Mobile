'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, User, Clock, Package, ChevronRight, Calendar } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [lastPatient, setLastPatient] = useState(null);
  const [stockStatus, setStockStatus] = useState('loading'); // 'green' | 'yellow' | 'red'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  async function fetchHomeData() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [todayRes, weekRes, lastPatientRes, stockRes] = await Promise.all([
        supabase.from('skin_analyses').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('skin_analyses').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('pharmacy_products').select('quantity'),
      ]);

      setStats({ today: todayRes.count || 0, week: weekRes.count || 0 });

      if (lastPatientRes.data) {
        setLastPatient(lastPatientRes.data);
      }

      if (stockRes.data) {
        const products = stockRes.data;
        const total = products.length;
        const outOfStock = products.filter(p => p.quantity === 0).length;
        const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 3).length;
        if (outOfStock > total * 0.3) setStockStatus('red');
        else if (lowStock > 0 || outOfStock > 0) setStockStatus('yellow');
        else setStockStatus('green');
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }

  const stockColors = {
    green: { color: '#4caf88', label: 'Stock óptimo', glow: '#4caf8840' },
    yellow: { color: '#f0a500', label: 'Algunas alertas', glow: '#f0a50040' },
    red: { color: '#e05252', label: 'Stock crítico', glow: '#e0525240' },
    loading: { color: '#6b6055', label: 'Cargando...', glow: 'transparent' },
  };

  const stock = stockColors[stockStatus];

  return (
    <>
      <main className="page-content fade-in">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'Figtree, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                BeSkinPro
              </p>
              <h1 className="page-title" style={{ fontSize: 26 }}>
                Bienvenido 👋
              </h1>
            </div>
            <div style={{
              width: 44, height: 44,
              borderRadius: 14,
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={20} color="var(--accent)" />
            </div>
          </div>
        </div>

        {/* MAIN CTA */}
        <Link href="/diagnostico" style={{ display: 'block', marginBottom: 20, textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #c9a96e 0%, #a87c45 50%, #8b5e30 100%)',
            borderRadius: 24,
            padding: '32px 24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(201, 169, 110, 0.35)',
            minHeight: '44vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 140, height: 140,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute', bottom: -20, left: -20,
              width: 100, height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }} />

            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.2)',
                padding: '5px 12px',
                borderRadius: 100,
                marginBottom: 16,
              }}>
                <Zap size={12} color="#0f0f1a" fill="#0f0f1a" />
                <span style={{ fontSize: 10, fontFamily: 'Figtree, sans-serif', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0f0f1a' }}>
                  AI Engine Activo
                </span>
              </div>
              <h2 style={{
                fontSize: 34,
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 900,
                color: '#0f0f1a',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                marginBottom: 10,
              }}>
                NUEVO<br />DIAGNÓSTICO
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(15,15,26,0.65)', fontWeight: 500, lineHeight: 1.4 }}>
                Análisis Baumann completo con IA vocal, foto y recomendación de productos
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              marginTop: 24,
            }}>
              <span style={{
                background: '#0f0f1a',
                color: '#c9a96e',
                padding: '12px 24px',
                borderRadius: 14,
                fontSize: 13,
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                Iniciar Ahora
              </span>
              <ChevronRight size={32} color="rgba(15,15,26,0.4)" />
            </div>
          </div>
        </Link>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <Clock size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontFamily: 'Figtree, sans-serif', fontWeight: 900, color: 'var(--text)' }}>
              {loading ? '—' : stats.today}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'Figtree, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hoy
            </div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <Calendar size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontFamily: 'Figtree, sans-serif', fontWeight: 900, color: 'var(--text)' }}>
              {loading ? '—' : stats.week}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'Figtree, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Esta semana
            </div>
          </div>
        </div>

        {/* Last Patient */}
        {lastPatient && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">Último Paciente</span>
            </div>
            <Link href={`/paciente?id=${lastPatient.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46,
                  borderRadius: 14,
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 800,
                  fontSize: 16,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}>
                  {lastPatient.first_name?.[0]}{lastPatient.last_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {lastPatient.first_name} {lastPatient.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(lastPatient.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-subtle)" />
              </div>
            </Link>
          </div>
        )}

        {/* Stock Semaphore */}
        <div className="section-header">
          <span className="section-title">Estado del Stock</span>
        </div>
        <Link href="/stock" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46,
              borderRadius: 14,
              background: `${stock.glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Package size={22} color={stock.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                Farmacia
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div className="semaphore-dot" style={{ background: stock.color, color: stock.color }} />
                <span style={{ fontSize: 12, color: stock.color, fontWeight: 600 }}>{stock.label}</span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-subtle)" />
          </div>
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
