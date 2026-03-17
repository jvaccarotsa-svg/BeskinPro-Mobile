'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Camera, Upload, Mic, MicOff, ChevronRight, ChevronLeft,
    Check, X, Zap, RefreshCw, AlertCircle, Volume2, Pause, User
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { calculateBaumannType, baumannDescriptions, baumannFullDescriptions } from '@/lib/baumannEngine';
import { BAUMANN_QUESTIONS, VoiceChatbot } from '@/lib/voiceChatbot';

// ─── Tabs ────────────────────────────────────────────────────────────
const TABS = [
    { id: 'foto', label: '📸 Fotos', step: 1 },
    { id: 'encuesta', label: '🎙️ Encuesta', step: 2 },
    { id: 'analisis', label: '🔬 Análisis', step: 3 },
];

function DiagnosticoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientId = searchParams.get('patient_id');
    const patientName = searchParams.get('patient_name') || 'Paciente';

    const [activeTab, setActiveTab] = useState('foto');

    // --- Photo State ---
    const [standardPhoto, setStandardPhoto] = useState(null);
    const [uvPhoto, setUvPhoto] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraMode, setCameraMode] = useState('standard');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const standardInputRef = useRef(null);
    const uvInputRef = useRef(null);

    // --- Chatbot State ---
    const [chatMode, setChatMode] = useState('voice'); // 'voice' | 'manual'
    const [chatMessages, setChatMessages] = useState([]);
    const [currentQIdx, setCurrentQIdx] = useState(-1);
    const [botState, setBotState] = useState('idle');
    const [baumannAnswers, setBaumannAnswers] = useState({});
    const [surveyDone, setSurveyDone] = useState(false);
    const [awaitingConfirm, setAwaitingConfirm] = useState(false);
    const [pendingAnswer, setPendingAnswer] = useState(null);
    const [micPermission, setMicPermission] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
    const chatbotRef = useRef(null);
    const chatEndRef = useRef(null);
    const micTimeoutRef = useRef(null);
    const activeSessionRef = useRef(0);
    // Ref to accumulate voice answers — avoids stale React state closure bug
    const voiceAnswersRef = useRef({});

    // --- Manual mode state ---
    const [manualQIdx, setManualQIdx] = useState(0);
    const [manualAnswers, setManualAnswers] = useState({});

    // --- Analysis State ---
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [analysisSaved, setAnalysisSaved] = useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    // ──────────────────────────────────────────────────────────────────
    // CAMERA
    // ──────────────────────────────────────────────────────────────────
    async function startCamera(mode) {
        setCameraMode(mode);
        setCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            alert('No se pudo acceder a la cámara. Comprueba los permisos del navegador.');
            setCameraActive(false);
        }
    }

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }

    function capturePhoto() {
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (cameraMode === 'standard') setStandardPhoto(dataUrl);
        else setUvPhoto(dataUrl);
        stopCamera();
    }

    function handleFileUpload(e, type) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (type === 'standard') setStandardPhoto(ev.target.result);
            else setUvPhoto(ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    // ──────────────────────────────────────────────────────────────────
    // CHATBOT DE VOZ
    // ──────────────────────────────────────────────────────────────────
    function addMessage(role, text, qIdx = null) {
        setChatMessages(prev => [...prev, { role, text, qIdx, id: Date.now() + '-' + Math.random().toString(36).substring(2, 9) }]);
    }

    function initChatbot() {
        chatbotRef.current = new VoiceChatbot(
            (state) => setBotState(state),
            (qId, value) => {
                setBaumannAnswers(prev => ({ ...prev, [qId]: value }));
            }
        );
        return chatbotRef.current;
    }

    // ── Full reset: clears all survey/analysis state before a new session ──
    function resetAllState() {
        setChatMessages([]);
        setCurrentQIdx(-1);
        setBotState('idle');
        setBaumannAnswers({});
        setSurveyDone(false);
        setAwaitingConfirm(false);
        setPendingAnswer(null);
        setManualQIdx(0);
        setManualAnswers({});
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisSaved(false);
        voiceAnswersRef.current = {};
    }

    async function startSurvey() {
        // Always start from zero
        resetAllState();
        activeSessionRef.current += 1;
        const bot = initChatbot();

        // Request microphone permission explicitly before starting recognition.
        // This MUST happen from a user gesture (button tap) to work on mobile.
        setMicPermission('requesting');
        const { granted, reason } = await bot.requestMicPermission();
        if (!granted) {
            setMicPermission('denied');
            addMessage('assistant', `El micrófono no está disponible (${reason || 'permiso denegado'}). Cambia al modo manual para continuar.`);
            return;
        }
        setMicPermission('granted');

        addMessage('assistant', `¡Hola! Voy a hacerte unas preguntas sobre tu piel para determinar tu tipo Baumann. Responde en voz alta de forma natural. ¿Listo?`);
        await bot.speak(`¡Hola!. Voy a hacerte unas preguntas sobre tu piel para determinar tu tipo Baumann. Responde de forma natural. Empezamos.`);
        await askQuestion(0, bot);
    }

    async function askQuestion(idx, bot) {
        if (idx >= BAUMANN_QUESTIONS.length) {
            finishSurvey(bot);
            return;
        }
        setCurrentQIdx(idx);
        const q = BAUMANN_QUESTIONS[idx];
        addMessage('assistant', q.question, idx);
        await bot.speak(q.question);
        console.log('[askQuestion] Spoken. Waiting for mic activation...');
        if (micTimeoutRef.current) clearTimeout(micTimeoutRef.current);
        // Larger delay for mobile OS to release audio output and ready the mic
        micTimeoutRef.current = setTimeout(() => {
            console.log('[askQuestion] Activating mic now for question:', idx);
            listenForAnswer(idx, bot);
        }, 800);
    }

    function listenForAnswer(idx, bot, retryCount = 0) {
        const q = BAUMANN_QUESTIONS[idx];
        const currentSession = activeSessionRef.current;
        bot.listen().then(async (transcript) => {
            if (activeSessionRef.current !== currentSession) return;
            const lowTranscript = transcript.toLowerCase();
            addMessage('user', transcript, idx);

            const parsedValue = q.parseResponse(transcript);
            const containsQuestion = transcript.includes('?') ||
                lowTranscript.includes('que es') ||
                lowTranscript.includes('que son') ||
                lowTranscript.includes('porque') ||
                lowTranscript.includes('como se');

            if (parsedValue !== null && !containsQuestion) {
                // Clearly understood answer and no question — store in ref AND state
                voiceAnswersRef.current = { ...voiceAnswersRef.current, [q.field]: parsedValue };
                setBaumannAnswers(prev => ({ ...prev, [q.field]: parsedValue }));
                await bot.speak('Entendido.');
                if (activeSessionRef.current !== currentSession) return;
                await askQuestion(idx + 1, bot);
            } else {
                // Either ambiguous OR contains a question - Consult AI
                setBotState('processing');
                console.log('[listenForAnswer] Consulting AI for:', transcript);
                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: transcript,
                            context: `Estamos en la pregunta: ${q.question}`
                        }),
                    });
                    const data = await res.json();
                    if (activeSessionRef.current !== currentSession) return;
                    if (data.text) {
                        addMessage('assistant', data.text);
                        await bot.speak(data.text);
                        if (activeSessionRef.current !== currentSession) return;

                        let finalValue = parsedValue;
                        if (finalValue === null && data.intent) {
                            switch (q.field) {
                                case 'tirantez': finalValue = data.intent === 'HIGH' ? 8 : (data.intent === 'MEDIUM' ? 4 : 1); break;
                                case 'brillo_zona_t': finalValue = data.intent === 'HIGH' ? 1 : (data.intent === 'MEDIUM' ? 0.5 : 0); break;
                                case 'ardor_picor': finalValue = data.intent === 'HIGH' ? 1 : (data.intent === 'MEDIUM' ? 0.5 : 0); break;
                                case 'manchas_visibles': finalValue = data.intent === 'HIGH' ? 1 : (data.intent === 'MEDIUM' ? 0.5 : 0); break;
                                case 'arrugas_visibles': finalValue = data.intent === 'HIGH' ? 1 : (data.intent === 'MEDIUM' ? 0.5 : 0); break;
                                case 'exposicion_solar_alta': finalValue = data.intent === 'HIGH' ? true : false; break;
                                case 'reaccion_cosmeticos': finalValue = data.intent === 'HIGH' ? 1 : (data.intent === 'MEDIUM' ? 0.5 : 0); break;
                                case 'descamacion': finalValue = data.intent === 'HIGH' ? -1 : (data.intent === 'MEDIUM' ? -0.5 : 0); break;
                            }
                            console.log('[listenForAnswer] AI extracted intent:', data.intent, 'mapped to:', finalValue);
                        }

                        if (finalValue !== null) {
                            voiceAnswersRef.current = { ...voiceAnswersRef.current, [q.field]: finalValue };
                            setBaumannAnswers(prev => ({ ...prev, [q.field]: finalValue }));
                        }
                        // Advance to next question regardless of answer to avoid repetition, as requested by user
                        console.log('[listenForAnswer] AI answered, advancing to next question:', idx + 1);
                        await askQuestion(idx + 1, bot);
                    } else {
                        throw new Error('No AI response');
                    }
                } catch (aiErr) {
                    console.error('[listenForAnswer] AI query failed:', aiErr);
                    if (parsedValue !== null) {
                        voiceAnswersRef.current = { ...voiceAnswersRef.current, [q.field]: parsedValue };
                        setBaumannAnswers(prev => ({ ...prev, [q.field]: parsedValue }));
                    }
                    if (activeSessionRef.current !== currentSession) return;
                    // Skip to next even on AI failure to avoid loops
                    console.log('[listenForAnswer] AI failed, advancing anyway.');
                    await askQuestion(idx + 1, bot);
                }
            }
        }).catch(async (err) => {
            if (activeSessionRef.current !== currentSession) return;
            const msg = err?.message || '';
            console.warn('[listenForAnswer] error:', msg, 'retry:', retryCount);
            if (msg === 'aborted') {
                console.log('[listenForAnswer] Recognition aborted, skipping error handling.');
                return;
            }

            // Not supported or permission denied — go straight to manual
            if (msg === 'no_recognition' || msg === 'recognition_start_failed' || msg === 'not-allowed' || msg === 'service-not-allowed') {
                addMessage('assistant', 'El micrófono no está disponible en este navegador. Cambia al modo manual.');
                bot.speak('El micrófono no está disponible. Cambia al modo manual.');
                setChatMode('manual');
                return;
            }

            // Too many retries — suggest manual
            if (retryCount >= 2) {
                addMessage('assistant', 'No puedo escucharte. Prueba el modo manual para continuar.');
                bot.speak('Prueba el modo manual.');
                setChatMode('manual');
                return;
            }

            // Timeout or no speech detected — repeat question
            if (msg === 'timeout' || msg === 'no_speech_detected') {
                console.log('[listenForAnswer] Silence or no speech, repeating question.');
                addMessage('assistant', 'No te he escuchado bien. Repito la pregunta.');
                await bot.speak('No te he escuchado bien. Repito la pregunta.');
                if (activeSessionRef.current !== currentSession) return;
                await askQuestion(idx, bot); // Repeat SAME question index
                return;
            }

            // Other transient error — move to next if persistent
            console.log('[listenForAnswer] Other error, advancing to next question.');
            await bot.speak('Sigamos.');
            if (activeSessionRef.current !== currentSession) return;
            await askQuestion(idx + 1, bot);
        });
    }

    async function handleRetry(idx) {
        if (!chatbotRef.current) return;
        console.log('[handleRetry] Retrying question index:', idx);
        activeSessionRef.current += 1;
        setBotState('idle');
        if (micTimeoutRef.current) clearTimeout(micTimeoutRef.current);
        // Remove future answers from both state and the ref
        BAUMANN_QUESTIONS.slice(idx).forEach(q => {
            delete voiceAnswersRef.current[q.field];
        });
        setBaumannAnswers(prev => {
            const updated = { ...prev };
            BAUMANN_QUESTIONS.slice(idx).forEach(q => delete updated[q.field]);
            return updated;
        });
        // Stop current speaking/listening if any
        chatbotRef.current.stop();
        addMessage('assistant', `De acuerdo, repetimos la pregunta: ${BAUMANN_QUESTIONS[idx].question}`);
        await askQuestion(idx, chatbotRef.current);
    }



    function finishSurvey(bot) {
        bot.stop();
        // Flush the ref into state to guarantee all answers are captured
        // (avoids stale-closure issue where last setState hasn't propagated yet)
        setBaumannAnswers(voiceAnswersRef.current);
        setSurveyDone(true);
        const summary = Object.entries(voiceAnswersRef.current).map(([k, v]) => `${k}: ${v}`).join(', ');
        console.log('[finishSurvey] Final voice answers:', summary);
        addMessage('assistant', `¡Perfecto! He registrado todas tus respuestas. Ahora puedes proceder al análisis.`);
        bot.speak('Perfecto. He registrado todas tus respuestas. Puedes proceder al análisis.');
    }

    function stopSurvey() {
        chatbotRef.current?.stop();
        setBotState('idle');
    }

    // ──────────────────────────────────────────────────────────────────
    // MANUAL MODE
    // ──────────────────────────────────────────────────────────────────
    function handleManualAnswer(value) {
        const q = BAUMANN_QUESTIONS[manualQIdx];
        // Build updated answers including the current answer BEFORE calling setState
        // so we can pass the complete set to setBaumannAnswers on the last question.
        const updatedManual = { ...manualAnswers, [q.field]: value };
        setManualAnswers(updatedManual);
        if (manualQIdx + 1 < BAUMANN_QUESTIONS.length) {
            setManualQIdx(prev => prev + 1);
        } else {
            // Last question — flush complete answers into baumannAnswers
            setBaumannAnswers(updatedManual);
            console.log('[handleManualAnswer] Final manual answers:', updatedManual);
            setSurveyDone(true);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // ANALYSIS
    // ──────────────────────────────────────────────────────────────────
    async function runAnalysis() {
        setAnalyzing(true);
        setAnalysisError(null);

        try {
            // Merge answers — manual answers take priority to cover both modes.
            // Voice mode: baumannAnswers is set from voiceAnswersRef in finishSurvey.
            // Manual mode: baumannAnswers is set from updatedManual in handleManualAnswer.
            const allAnswers = { ...baumannAnswers, ...manualAnswers };
            console.log('[runAnalysis] Input to Baumann engine:', allAnswers);

            // Get patient DOB for age calculation
            const { data: patientData } = await supabase.from('patients').select('date_of_birth').eq('id', patientId).single();
            if (patientData?.date_of_birth) {
                const age = Math.floor((Date.now() - new Date(patientData.date_of_birth)) / 31557600000);
                allAnswers.edad_mayor_35 = age > 35;
            }

            // Optional: Gemini Vision analysis for photos
            let visionData = {};
            if (standardPhoto && process.env.NEXT_PUBLIC_GEMINI_ENABLED !== 'false') {
                try {
                    const res = await fetch('/api/analyze-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageDataUrl: standardPhoto, uvImageDataUrl: uvPhoto }),
                    });
                    if (res.ok) {
                        visionData = await res.json();
                    }
                } catch (e) {
                    console.warn('Vision analysis failed, continuing with questionnaire only:', e);
                }
            }

            // Combine questionnaire + vision data
            const engineInput = { ...allAnswers, ...visionData };

            // Run Baumann engine
            const result = calculateBaumannType(engineInput);

            // Upload photos to Supabase Storage
            let standardPhotoUrl = null;
            let uvPhotoUrl = null;

            if (standardPhoto) {
                const blob = await (await fetch(standardPhoto)).blob();
                const path = `${patientId}/${Date.now()}_standard.jpg`;
                const { data: uploadData } = await supabase.storage.from('skin-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                if (uploadData) {
                    const { data: urlData } = supabase.storage.from('skin-photos').getPublicUrl(path);
                    standardPhotoUrl = urlData.publicUrl;
                }
            }

            if (uvPhoto) {
                const blob = await (await fetch(uvPhoto)).blob();
                const path = `${patientId}/${Date.now()}_uv.jpg`;
                const { data: uploadData } = await supabase.storage.from('skin-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                if (uploadData) {
                    const { data: urlData } = supabase.storage.from('skin-photos').getPublicUrl(path);
                    uvPhotoUrl = urlData.publicUrl;
                }
            }

            if (patientId) {
                // Save baumann_responses
                const { data: responseData } = await supabase.from('baumann_responses').insert([{
                    patient_id: patientId,
                    lifestyle: { baumann_data: allAnswers },
                    created_at: new Date().toISOString(),
                }]).select().single();

                // Save skin_analyses
                const { data: savedAnalysis, error: saveError } = await supabase.from('skin_analyses').insert([{
                    patient_id: patientId,
                    baumann_response_id: responseData?.id || null,
                    baumann_code: result.code,
                    sebo_score: parseFloat(result.scores['sebo'] || 0),
                    sebo_label: result.code[0],
                    sensibilidad_score: parseFloat(result.scores['sensibilidad'] || 0),
                    sensibilidad_label: result.code[1],
                    pigmentacion_score: parseFloat(result.scores['pigmentacion'] || 0),
                    pigmentacion_label: result.code[2],
                    envejecimiento_score: parseFloat(result.scores['envejecimiento'] || 0),
                    envejecimiento_label: result.code[3],
                    feature_scores: result,
                    standard_photo_url: standardPhotoUrl,
                    uv_photo_url: uvPhotoUrl,
                    analyzed_at: new Date().toISOString()
                }]).select().single();

                if (saveError) throw saveError;
                setAnalysisResult({ ...result, analysisId: savedAnalysis.id });
                setAnalysisSaved(true);
            } else {
                // Preview mode only
                setAnalysisResult(result);
                setAnalysisSaved(false);
            }

        } catch (err) {
            console.error('Analysis error:', err);
            setAnalysisError(`Hubo un error técnico al guardar en la base de datos: ${err.message || JSON.stringify(err)}`);
        } finally {
            setAnalyzing(false);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────
    const progress = activeTab === 'foto' ? 33 : activeTab === 'encuesta' ? 66 : 100;

    return (
        <>
            <main className="page-content fade-in">
                {/* Header */}
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="var(--accent)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'Figtree, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Diagnóstico</div>
                            <div style={{ fontSize: 14, fontFamily: 'Figtree, sans-serif', fontWeight: 700, color: 'var(--text)' }}>{patientName}</div>
                        </div>
                    </div>
                    {/* Progress */}
                    <div className="progress-bar" style={{ marginTop: 12 }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 16, padding: 4, border: '1px solid var(--border)' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: activeTab === tab.id ? 'linear-gradient(135deg, var(--accent), #a87c45)' : 'transparent',
                            color: activeTab === tab.id ? '#0f0f1a' : 'var(--text-muted)',
                            fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 12,
                            transition: 'all 0.2s', whiteSpace: 'nowrap',
                        }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB: FOTOS ── */}
                {activeTab === 'foto' && (
                    <div className="space-y-4 fade-in">
                        {/* Camera view */}
                        {cameraActive ? (
                            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', aspectRatio: '3/4' }}>
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                                {/* Oval overlay */}
                                <div className="camera-overlay">
                                    <div className="face-oval" />
                                    <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Figtree, sans-serif', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)', textAlign: 'center', padding: '0 24px' }}>
                                        Centra el rostro dentro del óvalo
                                    </p>
                                </div>
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                                    <button onClick={stopCamera} className="btn btn-ghost btn-icon" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                                        <X size={20} />
                                    </button>
                                    <button onClick={capturePhoto}
                                        style={{ width: 68, height: 68, borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--accent)' }} />
                                    </button>
                                    <div style={{ width: 44 }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Standard Photo Card */}
                                <PhotoCard
                                    title="📸 Foto Estándar"
                                    subtitle="Luz natural, cara descubierta"
                                    photo={standardPhoto}
                                    onCamera={() => startCamera('standard')}
                                    onUpload={() => standardInputRef.current?.click()}
                                    onRetake={() => setStandardPhoto(null)}
                                />
                                <input ref={standardInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'standard')} />

                                {/* UV Photo Card */}
                                <PhotoCard
                                    title="🟣 Foto UV"
                                    subtitle="Con luz Wood o filtro UV"
                                    photo={uvPhoto}
                                    onCamera={() => startCamera('uv')}
                                    onUpload={() => uvInputRef.current?.click()}
                                    onRetake={() => setUvPhoto(null)}
                                />
                                <input ref={uvInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'uv')} />
                            </>
                        )}

                        {!cameraActive && (
                            <div className="sticky-cta">
                                <button className="btn btn-primary btn-full btn-lg" onClick={() => setActiveTab('encuesta')}>
                                    Continuar a Encuesta <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: ENCUESTA BAUMANN ── */}
                {activeTab === 'encuesta' && (
                    <div className="fade-in">
                        {/* Mode Toggle */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {['voice', 'manual'].map(mode => (
                                <button key={mode} onClick={() => { setChatMode(mode); stopSurvey(); resetAllState(); }} style={{
                                    flex: 1, padding: '10px', borderRadius: 12, border: `1.5px solid ${chatMode === mode ? 'var(--accent)' : 'var(--border)'}`,
                                    background: chatMode === mode ? 'var(--accent-dim)' : 'var(--bg-card)',
                                    color: chatMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                                    fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                    {mode === 'voice' ? <><Volume2 size={14} /> Voz</> : <><RefreshCw size={14} /> Manual</>}
                                </button>
                            ))}
                        </div>

                        {chatMode === 'voice' ? (
                            <VoiceSurveyPanel
                                chatMessages={chatMessages}
                                botState={botState}
                                currentQIdx={currentQIdx}
                                surveyDone={surveyDone}
                                onStart={startSurvey}
                                onStop={stopSurvey}
                                onRetry={handleRetry}
                                onReset={resetAllState}
                                chatEndRef={chatEndRef}
                                totalQ={BAUMANN_QUESTIONS.length}
                                micPermission={micPermission}
                            />
                        ) : (
                            <ManualSurveyPanel
                                questions={BAUMANN_QUESTIONS}
                                currentIdx={manualQIdx}
                                onAnswer={handleManualAnswer}
                                onPrev={() => setManualQIdx(i => Math.max(0, i - 1))}
                                onReset={resetAllState}
                                surveyDone={surveyDone}
                            />
                        )}

                        {surveyDone && (
                            <div className="sticky-cta" style={{ marginTop: 16 }}>
                                <button className="btn btn-primary btn-full btn-lg" onClick={() => setActiveTab('analisis')}>
                                    Ver Análisis <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: ANÁLISIS ── */}
                {activeTab === 'analisis' && (
                    <div className="fade-in space-y-4">
                        {!analysisResult && !analyzing && (
                            <>
                                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                                    <Zap size={40} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
                                    <h2 style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
                                        ¿Todo listo?
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                                        El motor Baumann analizará las respuestas de la encuesta{standardPhoto ? ' y tu foto facial' : ''} para determinar el tipo de piel.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, textAlign: 'left' }}>
                                        <CheckItem done={!!standardPhoto || !!uvPhoto} label="Fotos capturadas" optional />
                                        <CheckItem done={surveyDone} label="Encuesta Baumann completada" />
                                        {!patientId && <CheckItem done={false} label="Paciente seleccionado — vuelve a Paciente" />}
                                    </div>

                                    {analysisError && (
                                        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--danger-dim)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 12, color: 'var(--danger)', fontSize: 13 }}>
                                            <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                                            {analysisError}
                                            <button className="btn btn-outline btn-sm" onClick={() => { setAnalysisError(null); resetAllState(); setActiveTab('encuesta'); }} style={{ marginTop: 12, width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                                                <RefreshCw size={14} /> Empezar encuesta de nuevo
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="sticky-cta">
                                    <button
                                        className="btn btn-primary btn-full btn-lg"
                                        onClick={runAnalysis}
                                        disabled={!surveyDone}
                                        style={{ opacity: !surveyDone ? 0.5 : 1 }}
                                    >
                                        <Zap size={18} /> Ejecutar Diagnóstico IA
                                    </button>
                                </div>
                            </>
                        )}

                        {analyzing && <AnalyzingScreen />}

                        {analysisResult && <AnalysisResult result={analysisResult} patientId={patientId} router={router} standardPhoto={standardPhoto} uvPhoto={uvPhoto} />}
                    </div>
                )}
            </main>
            <BottomNav />
        </>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────

function PhotoCard({ title, subtitle, photo, onCamera, onUpload, onRetake }) {
    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
                </div>
                {photo && (
                    <button onClick={onRetake} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(224,82,82,0.3)' }}>
                        <RefreshCw size={14} /> Repetir
                    </button>
                )}
            </div>
            {photo ? (
                <div style={{ position: 'relative', aspectRatio: '4/3' }}>
                    <img src={photo} alt="Foto capturada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--success)', borderRadius: 100, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} color="white" />
                        <span style={{ color: 'white', fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 11 }}>OK</span>
                    </div>
                </div>
            ) : (
                <div style={{ padding: 16, display: 'flex', gap: 10 }}>
                    <button onClick={onCamera} className="btn btn-outline" style={{ flex: 1, gap: 6 }}>
                        <Camera size={16} /> Cámara
                    </button>
                    <button onClick={onUpload} className="btn btn-ghost" style={{ flex: 1, gap: 6 }}>
                        <Upload size={16} /> Galería
                    </button>
                </div>
            )}
        </div>
    );
}

function VoiceSurveyPanel({ chatMessages, botState, currentQIdx, surveyDone, onStart, onStop, onRetry, onReset, chatEndRef, totalQ, micPermission }) {
    const stateLabels = { idle: 'Listo', speaking: 'Hablando...', preparing: 'Preparando micrófono...', listening: '¡Dinos!', processing: 'Procesando...' };
    const stateColors = { idle: 'var(--text-muted)', speaking: 'var(--accent)', preparing: 'var(--warning)', listening: 'var(--danger)', processing: 'var(--warning)' };

    return (
        <div>
            {/* Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 13, color: stateColors[botState] || 'var(--text-muted)' }}>
                        Estado: {stateLabels[botState] || 'Listo'}
                    </span>
                </div>
                {currentQIdx >= 0 && !surveyDone && (
                    <span className="badge badge-gold">{currentQIdx + 1}/{totalQ}</span>
                )}
            </div>

            {/* Mic permission denied banner */}
            {micPermission === 'denied' && (
                <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--danger-dim)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <MicOff size={16} color="var(--danger)" />
                        <span style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--danger)' }}>Micrófono bloqueado</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        El navegador ha denegado el acceso al micrófono. Ve a <strong>Ajustes del navegador → Permisos del sitio → Micrófono</strong> y permite el acceso. Luego recarga la página.
                    </p>
                </div>
            )}

            {/* Huge Active Mic Indicator */}
            {botState === 'listening' && (
                <div style={{ marginBottom: 16, padding: '30px 20px', background: 'rgba(224,82,82,0.1)', border: '2px solid var(--danger)', borderRadius: 20, textAlign: 'center', animation: 'pulse 2s infinite' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, height: 40, marginBottom: 16 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="wave-bar" style={{ width: 8, height: '100%', background: 'var(--danger)', '--wave-delay': `${i * 0.12}s`, borderRadius: 4 }} />
                        ))}
                    </div>
                    <h3 style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--danger)', margin: 0 }}>
                        ¡HABLA AHORA!
                    </h3>
                    <p style={{ color: 'var(--danger)', opacity: 0.8, fontSize: 14, marginTop: 4 }}>Te estamos escuchando...</p>
                </div>
            )}

            {botState === 'preparing' && (
                <div style={{ marginBottom: 16, padding: '16px', background: 'var(--warning-dim)', border: '1px dashed var(--warning)', borderRadius: 14, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--warning)' }}>Preparando micrófono...</p>
                    <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>Espera a que el navegador active el dispositivo.</p>
                </div>
            )}

            {/* Chat area */}
            {chatMessages.length > 0 ? (
                <div className="chat-container" style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 16, padding: '4px 0' }}>
                    {chatMessages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
                            <div className={`chat-bubble chat-bubble-${msg.role}`} style={{ position: 'relative' }}>
                                {msg.text}
                            </div>
                            {msg.qIdx !== null && (msg.role === 'user' || msg.role === 'assistant') && (
                                <button
                                    onClick={() => onRetry(msg.qIdx)}
                                    className="btn btn-ghost"
                                    style={{
                                        fontSize: 10,
                                        padding: '4px 8px',
                                        height: 'auto',
                                        borderRadius: 8,
                                        color: 'var(--accent)',
                                        borderColor: 'var(--accent-dim)',
                                        marginTop: -2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <RefreshCw size={10} /> Corregir / Repetir
                                </button>
                            )}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-subtle)' }}>
                    <Volume2 size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 600, fontSize: 14 }}>El asistente de voz hará las preguntas Baumann</p>
                    <p style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 6 }}>Responde en voz alta de forma natural</p>
                </div>
            )}

            {surveyDone ? (
                <div style={{ padding: '16px', background: 'var(--success-dim)', borderRadius: 14, border: '1px solid rgba(76,175,136,0.3)', textAlign: 'center' }}>
                    <Check size={24} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>¡Encuesta completada!</p>
                </div>
            ) : currentQIdx === -1 ? (
                <button className="btn btn-primary btn-full btn-lg" onClick={onStart} disabled={micPermission === 'requesting'}>
                    <Mic size={18} /> {micPermission === 'requesting' ? 'Activando micrófono...' : 'Iniciar Encuesta por Voz'}
                </button>
            ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={onStop} style={{ flex: 1 }}>
                        <Pause size={16} /> Pausar
                    </button>
                    <button className="btn btn-outline" onClick={onReset} style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                        <RefreshCw size={16} /> Reiniciar
                    </button>
                </div>
            )}
        </div>
    );
}

function ManualSurveyPanel({ questions, currentIdx, onAnswer, onPrev, surveyDone, onReset }) {
    if (surveyDone) {
        return (
            <div style={{ padding: 24, background: 'var(--success-dim)', borderRadius: 20, border: '1px solid rgba(76,175,136,0.3)', textAlign: 'center' }}>
                <Check size={32} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>¡Encuesta completada!</p>
            </div>
        );
    }

    const q = questions[currentIdx];
    const progress = ((currentIdx) / questions.length) * 100;

    return (
        <div>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {currentIdx + 1}/{questions.length}
                </span>
                <button onClick={onReset} className="btn btn-ghost btn-icon" style={{ padding: 6, gap: 4, height: 'auto', borderRadius: 8, fontSize: 11, color: 'var(--danger)', borderColor: 'rgba(224,82,82,0.3)' }}>
                    <RefreshCw size={12} /> Reiniciar
                </button>
            </div>

            {/* Question */}
            <div className="card fade-in" style={{ padding: 24, marginBottom: 20 }}>
                <p style={{ fontSize: 17, fontFamily: 'Figtree, sans-serif', fontWeight: 600, lineHeight: 1.45, color: 'var(--text)' }}>
                    {q.question}
                </p>
            </div>

            {/* Answer options — always delegate to onAnswer (parent handles last question) */}
            <div className="chip-group" style={{ justifyContent: 'center' }}>
                {getManualOptions(q.field).map(({ label, value }) => (
                    <button key={label} className="chip" style={{ fontSize: 15, padding: '12px 20px' }}
                        onClick={() => onAnswer(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {currentIdx > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={onPrev} style={{ marginTop: 16 }}>
                    <ChevronLeft size={14} /> Anterior
                </button>
            )}
        </div>
    );
}

function getManualOptions(field) {
    const map = {
        tirantez: [{ label: 'Mucha', value: 9 }, { label: 'Bastante', value: 7 }, { label: 'Poca', value: 4 }, { label: 'Nada', value: 1 }],
        brillo_zona_t: [{ label: 'Siempre', value: 1 }, { label: 'A veces', value: 0.5 }, { label: 'Nunca', value: 0 }],
        ardor_picor: [{ label: 'Frecuentemente', value: 1 }, { label: 'A veces', value: 0.5 }, { label: 'Nunca', value: 0 }],
        manchas_visibles: [{ label: 'Bastantes', value: 1 }, { label: 'Alguna', value: 0.5 }, { label: 'Ninguna', value: 0 }],
        arrugas_visibles: [{ label: 'Marcadas', value: 1 }, { label: 'Leves', value: 0.5 }, { label: 'Ninguna', value: 0 }],
        exposicion_solar_alta: [{ label: 'Alta', value: true }, { label: 'Moderada', value: false }, { label: 'Baja', value: false }],
        reaccion_cosmeticos: [{ label: 'Varias veces', value: 1 }, { label: 'Una vez', value: 0.5 }, { label: 'Nunca', value: 0 }],
        descamacion: [{ label: 'Con frecuencia', value: -1 }, { label: 'A veces', value: -0.5 }, { label: 'Nunca', value: 0 }],
    };
    return map[field] || [{ label: 'Sí', value: 1 }, { label: 'No', value: 0 }];
}

function CheckItem({ done, label, optional }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--success-dim)' : optional ? 'var(--bg-surface)' : 'var(--danger-dim)',
                border: `1.5px solid ${done ? 'var(--success)' : optional ? 'var(--border)' : 'var(--danger)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {done && <Check size={12} color="var(--success)" />}
            </div>
            <span style={{ fontSize: 14, color: done ? 'var(--text)' : 'var(--text-muted)', fontWeight: done ? 600 : 400 }}>{label} {optional && '(opcional)'}</span>
        </div>
    );
}

function AnalyzingScreen() {
    return (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-border)',
                }} />
                <div className="spinner" style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    borderWidth: 3, borderTopColor: 'var(--accent)',
                }} />
                <Zap size={28} color="var(--accent)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            <h2 style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Analizando...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                El motor IA está procesando las respuestas y calculando tu tipo Baumann
            </p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 12, marginTop: 12 }}>Aproximadamente 10-20 segundos</p>
        </div>
    );
}

function AnalysisResult({ result, patientId, router, standardPhoto, uvPhoto }) {
    return (
        <div className="space-y-4 fade-in">
            {/* Big Baumann Code */}
            <div className="card" style={{ padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'var(--accent-dim)' }} />
                <div style={{ fontSize: 11, fontFamily: 'Figtree, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Tipo de Piel Detectado
                </div>
                <div className="baumann-code">{result.code}</div>
                <div className="chip-group" style={{ justifyContent: 'center', marginTop: 16 }}>
                    {result.code.split('').map((char, i) => (
                        <span key={i} className="badge badge-gold">{baumannDescriptions[char]}</span>
                    ))}
                </div>
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {result.code.split('').map(c => baumannFullDescriptions[c]).join('. ')}
                </p>
            </div>

            {/* Score breakdown */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)' }}>
                        Desglose por Ejes
                    </div>
                </div>
                {Object.entries(result.explanations).map(([key, value]) => (
                    <div key={key} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                            <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>{key}</div>
                            <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{value}</div>
                        </div>
                        <div className="badge badge-gold" style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                            {parseFloat(result.scores[key]).toFixed(1)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Photo comparison */}
            {(standardPhoto || uvPhoto) && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)' }}>Comparativa Fotográfica</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: standardPhoto && uvPhoto ? '1fr 1fr' : '1fr', gap: 0 }}>
                        {standardPhoto && (
                            <div>
                                <img src={standardPhoto} alt="Estándar" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                                <div style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'Figtree, sans-serif', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Estándar</div>
                            </div>
                        )}
                        {uvPhoto && (
                            <div style={{ borderLeft: standardPhoto ? '1px solid var(--border)' : 'none' }}>
                                <img src={uvPhoto} alt="UV" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                                <div style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'Figtree, sans-serif', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>UV</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action */}
            <div className="sticky-cta">
                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => router.push(`/recomendacion?baumann=${result.code}&patient_id=${patientId}`)}
                >
                    Ver Recomendaciones <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}

export default function DiagnosticoPage() {
    return (
        <Suspense fallback={<div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="spinner" /></div>}>
            <DiagnosticoContent />
        </Suspense>
    );
}
