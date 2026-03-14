'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, User, Plus, Mic, MicOff, ChevronRight, X, Check, Calendar } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

function PacienteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [view, setView] = useState('search'); // 'search' | 'new'
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newPatient, setNewPatient] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: '' });
    const [saving, setSaving] = useState(false);
    const [listeningField, setListeningField] = useState(null);

    useEffect(() => {
        fetchPatients('');
    }, []);

    async function fetchPatients(term) {
        setLoading(true);
        try {
            let q = supabase.from('patients').select('*').order('last_name').limit(30);
            if (term) {
                q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,dni.ilike.%${term}%`);
            }
            const { data, error } = await q;
            if (!error) setPatients(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function handleSearchChange(e) {
        setSearch(e.target.value);
        fetchPatients(e.target.value);
    }

    function startVoiceInput(fieldName) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Tu navegador no soporta entrada de voz. Por favor, escribe el valor manualmente.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        setListeningField(fieldName);
        recognition.start();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setNewPatient(prev => ({ ...prev, [fieldName]: transcript }));
            setListeningField(null);
        };
        recognition.onerror = () => { setListeningField(null); };
        recognition.onend = () => { setListeningField(null); };
    }

    async function handleSavePatient() {
        if (!newPatient.first_name || !newPatient.last_name) {
            alert('Por favor introduce al menos nombre y apellido.');
            return;
        }
        setSaving(true);
        try {
            const { data, error } = await supabase.from('patients').insert([{
                first_name: newPatient.first_name,
                last_name: newPatient.last_name,
                date_of_birth: newPatient.date_of_birth || null,
                gender: newPatient.gender || null,
                created_at: new Date().toISOString(),
            }]).select().single();
            if (error) throw error;
            router.push(`/diagnostico?patient_id=${data.id}&patient_name=${encodeURIComponent(data.first_name + ' ' + data.last_name)}`);
        } catch (err) {
            console.error('Error saving patient:', err);
            alert('Error al guardar el paciente.');
        } finally {
            setSaving(false);
        }
    }

    function handleSelectPatient(patient) {
        router.push(`/diagnostico?patient_id=${patient.id}&patient_name=${encodeURIComponent(patient.first_name + ' ' + patient.last_name)}`);
    }

    return (
        <>
            <main className="page-content fade-in">
                <div className="page-header">
                    <h1 className="page-title">Paciente</h1>
                    <p className="page-subtitle">Busca o crea un paciente para iniciar el diagnóstico</p>
                </div>

                {/* Toggle */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    padding: 4,
                    marginBottom: 20,
                    border: '1px solid var(--border)',
                }}>
                    {['search', 'new'].map((v, i) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: 12,
                                border: 'none',
                                cursor: 'pointer',
                                background: view === v ? 'linear-gradient(135deg, var(--accent), #a87c45)' : 'transparent',
                                color: view === v ? '#0f0f1a' : 'var(--text-muted)',
                                fontFamily: 'Figtree, sans-serif',
                                fontWeight: 700,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s',
                            }}
                        >
                            {i === 0 ? <Search size={14} /> : <Plus size={14} />}
                            {i === 0 ? 'Buscar' : 'Nuevo Paciente'}
                        </button>
                    ))}
                </div>

                {view === 'search' ? (
                    <div className="space-y-4">
                        {/* Search input */}
                        <div className="input-wrapper">
                            <div className="input-icon-left"><Search size={18} /></div>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Nombre, apellido o DNI..."
                                value={search}
                                onChange={handleSearchChange}
                                autoFocus
                            />
                        </div>

                        {/* Results */}
                        <div className="space-y-2">
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-subtle)' }}>
                                    <div className="spinner" style={{ margin: '0 auto' }} />
                                </div>
                            ) : patients.length === 0 ? (
                                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <User size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                    <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 600, fontSize: 14 }}>
                                        No se encontraron pacientes
                                    </p>
                                    <p style={{ fontSize: 13, marginTop: 6, color: 'var(--text-subtle)' }}>
                                        Prueba con otro nombre o crea uno nuevo
                                    </p>
                                </div>
                            ) : (
                                patients.map(patient => {
                                    const age = patient.date_of_birth
                                        ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / 31557600000)
                                        : null;
                                    return (
                                        <button
                                            key={patient.id}
                                            onClick={() => handleSelectPatient(patient)}
                                            style={{
                                                width: '100%',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 16,
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 14,
                                                textAlign: 'left',
                                                transition: 'border-color 0.2s',
                                            }}
                                        >
                                            <div style={{
                                                width: 44, height: 44,
                                                borderRadius: 12,
                                                background: 'var(--accent-dim)',
                                                border: '1px solid var(--accent-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 15,
                                                color: 'var(--accent)', flexShrink: 0,
                                            }}>
                                                {patient.first_name?.[0]}{patient.last_name?.[0]}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {patient.first_name} {patient.last_name}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {age ? `${age} años · ` : ''}{patient.dni || 'Sin DNI'}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} color="var(--text-subtle)" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    /* New Patient Form */
                    <div className="space-y-4 fade-in">
                        <div style={{
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--accent-border)',
                            borderRadius: 14,
                            padding: '12px 16px',
                            fontSize: 13,
                            color: 'var(--accent)',
                            fontWeight: 500,
                            lineHeight: 1.4,
                        }}>
                            💡 Pulsa el micrófono en cada campo para dictar los datos por voz
                        </div>

                        {[
                            { field: 'first_name', label: 'Nombre *', placeholder: 'Ej: María', type: 'text' },
                            { field: 'last_name', label: 'Apellidos *', placeholder: 'Ej: García López', type: 'text' },
                        ].map(({ field, label, placeholder, type }) => (
                            <div className="form-group" key={field}>
                                <label className="form-label">{label}</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type={type}
                                        value={newPatient[field]}
                                        onChange={e => setNewPatient(p => ({ ...p, [field]: e.target.value }))}
                                        placeholder={placeholder}
                                        className="input-field"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={() => startVoiceInput(field)}
                                        className={`btn btn-icon ${listeningField === field ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flexShrink: 0 }}
                                        aria-label="Entrada por voz"
                                    >
                                        {listeningField === field ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>
                                </div>
                                {listeningField === field && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
                                        <div className="pulse-ring" style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--danger)', flexShrink: 0 }} />
                                        Escuchando... habla ahora
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="form-group">
                            <label className="form-label">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                value={newPatient.date_of_birth}
                                onChange={e => setNewPatient(p => ({ ...p, date_of_birth: e.target.value }))}
                                className="input-field"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Género</label>
                            <div className="chip-group">
                                {['Mujer', 'Hombre', 'No binario', 'Prefiero no decir'].map(g => (
                                    <button
                                        key={g}
                                        className={`chip${newPatient.gender === g ? ' selected' : ''}`}
                                        onClick={() => setNewPatient(p => ({ ...p, gender: g }))}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sticky-cta">
                            <button
                                className="btn btn-primary btn-full btn-lg"
                                onClick={handleSavePatient}
                                disabled={saving || !newPatient.first_name || !newPatient.last_name}
                                style={{ opacity: (!newPatient.first_name || !newPatient.last_name) ? 0.5 : 1 }}
                            >
                                {saving ? (
                                    <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Guardando...</>
                                ) : (
                                    <><Check size={18} /> Guardar e iniciar diagnóstico</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <BottomNav />
        </>
    );
}

export default function PacientePage() {
    return (
        <Suspense fallback={<div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="spinner" /></div>}>
            <PacienteContent />
        </Suspense>
    );
}
