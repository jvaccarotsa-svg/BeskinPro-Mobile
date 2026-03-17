/**
 * Voice Chatbot Engine for Baumann Survey
 * Uses Web Speech API (STT) + Speech Synthesis (TTS)
 * Mobile-safe: creates a new SpeechRecognition instance on each listen() call.
 */

// Robust Spanish word boundary matching that handles accents
function matchesWord(text, words) {
    const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize to remove accents for matching
    const baseWords = Array.isArray(words) ? words : [words];
    const normalizedWords = baseWords.map(w => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    return normalizedWords.some(word => {
        const regex = new RegExp(`(^|[\\s,.?!])${word}([\\s,.?!]|$)`, 'i');
        return regex.test(t);
    });
}

export const BAUMANN_QUESTIONS = [
    {
        id: 'q_tirantez',
        field: 'tirantez',
        question: '¿Sientes tirantez o sequedad en la piel después de lavar la cara?',
        confirmPhrase: (v) => v > 5 ? 'Sientes bastante tirantez, ¿correcto?' : 'Tu piel no siente mucha tirantez, ¿correcto?',
        parseResponse: (text) => {
            if (matchesWord(text, ['mucho', 'bastante', 'siempre', 'si', 'sí', 'claro', 'totalmente'])) return 8;
            if (matchesWord(text, ['poco', 'algo', 'a veces', 'un poco'])) return 4;
            if (matchesWord(text, ['no', 'nunca', 'nada', 'ningun', 'ninguno', 'ninguna'])) return 1;
            return null;
        }
    },
    {
        id: 'q_brillo',
        field: 'brillo_zona_t',
        question: '¿La piel de tu frente, nariz y barbilla (la zona T) tiende a brillar o estar grasa durante el día?',
        confirmPhrase: (v) => v > 0 ? 'Tu zona T tiende a brillar, ¿es así?' : 'Tu zona T no suele brillar, ¿correcto?',
        parseResponse: (text) => {
            if (matchesWord(text, ['mucho', 'siempre', 'si', 'sí', 'claro', 'bastante', 'grasa', 'graso'])) return 1;
            if (matchesWord(text, ['poco', 'a veces', 'un poco'])) return 0.5;
            if (matchesWord(text, ['no', 'nunca', 'nada'])) return 0;
            return null;
        }
    },
    {
        id: 'q_ardor',
        field: 'ardor_picor',
        question: '¿Notas ardor, picor o irritación al usar cosméticos o cremas?',
        confirmPhrase: (v) => v > 0 ? 'Tu piel reacciona con ardor o picor, ¿correcto?' : 'Tu piel tolera bien los cosméticos, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'ardor', 'picor', 'irritacion', 'siempre', 'mucho', 'frecuentemente'])) return 1;
            if (matchesWord(text, ['poco', 'algo', 'a veces'])) return 0.5;
            if (matchesWord(text, ['no', 'nunca', 'nada', 'rara', 'raramente'])) return 0;
            return null;
        }
    },
    {
        id: 'q_manchas',
        field: 'manchas_visibles',
        question: '¿Tienes manchas oscuras, marcas o irregularidades en el tono de tu piel?',
        confirmPhrase: (v) => v > 0 ? 'Tienes manchas o irregularidades de tono, ¿correcto?' : 'Tu tono de piel es bastante uniforme, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'tengo', 'muchas', 'muchos', 'bastante', 'manchas', 'marcas'])) return 1;
            if (matchesWord(text, ['poco', 'alguna', 'leve'])) return 0.5;
            if (matchesWord(text, ['no', 'ninguna', 'nada', 'uniforme'])) return 0;
            return null;
        }
    },
    {
        id: 'q_arrugas',
        field: 'arrugas_visibles',
        question: '¿Tienes arrugas, líneas de expresión marcadas o notas que tu piel ha perdido tersura?',
        confirmPhrase: (v) => v > 0 ? 'Tienes algunos signos de envejecimiento visibles, ¿correcto?' : 'Tu piel se mantiene bastante firme, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'muchas', 'muchos', 'marcadas', 'tersura', 'bastantes'])) return 1;
            if (matchesWord(text, ['algunas', 'pocas', 'leves', 'algo'])) return 0.5;
            if (matchesWord(text, ['no', 'ninguna', 'nada', 'firme'])) return 0;
            return null;
        }
    },
    {
        id: 'q_solar',
        field: 'exposicion_solar_alta',
        question: '¿Te expones al sol frecuentemente sin protección o has tenido mucha exposición solar a lo largo de tu vida?',
        confirmPhrase: (v) => v ? 'Tienes alta exposición solar, ¿correcto?' : 'Tu exposición solar es moderada o baja, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'mucho', 'frecuentemente', 'alta', 'bastante'])) return true;
            if (matchesWord(text, ['no', 'nunca', 'poco', 'baja', 'moderada'])) return false;
            return null;
        }
    },
    {
        id: 'q_cosmeticos',
        field: 'reaccion_cosmeticos',
        question: '¿Has tenido alguna vez reacción adversa, alergia o intolerancia a algún cosmético o crema?',
        confirmPhrase: (v) => v > 0 ? 'Has tenido reacciones a cosméticos, ¿correcto?' : 'Nunca has tenido reacciones a cosméticos, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'reaccion', 'alergia', 'intolerancia', 'varias'])) return 1;
            if (matchesWord(text, ['una vez', 'alguna', 'alguna vez'])) return 0.5;
            if (matchesWord(text, ['no', 'nunca', 'jamas'])) return 0;
            return null;
        }
    },
    {
        id: 'q_descamacion',
        field: 'descamacion',
        question: '¿Tu piel se descama o tienes zonas con piel seca que se pela?',
        confirmPhrase: (v) => v < 0 ? 'Tienes descamación o zonas que se pelan, ¿correcto?' : 'No tienes problemas de descamación, ¿verdad?',
        parseResponse: (text) => {
            if (matchesWord(text, ['si', 'sí', 'mucho', 'bastante', 'descama', 'pela'])) return -1;
            if (matchesWord(text, ['poco', 'a veces', 'algo'])) return -0.5;
            if (matchesWord(text, ['no', 'nunca'])) return 0;
            return null;
        }
    }
];

const LISTEN_TIMEOUT_MS = 10000; // 10 second safety timeout

export class VoiceChatbot {
    constructor(onStateChange, onAnswer, language = 'es-ES') {
        this.language = language;
        this.onStateChange = onStateChange; // 'idle' | 'speaking' | 'listening' | 'processing'
        this.onAnswer = onAnswer;
        this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this._hasSpeechRecognition = this._checkSupport();
    }

    _checkSupport() {
        if (typeof window === 'undefined') return false;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            console.warn('SpeechRecognition not supported in this browser.');
            return false;
        }
        return true;
    }

    /**
     * Explicitly requests microphone permission via getUserMedia.
     * MUST be called from a user gesture (button tap) — required on mobile.
     * Returns { granted: true } or { granted: false, reason }
     */
    async requestMicPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop immediately — we only needed it to trigger the permission dialog
            stream.getTracks().forEach(t => t.stop());
            return { granted: true };
        } catch (err) {
            const reason = err?.name || err?.message || 'unknown';
            console.warn('[VoiceChatbot] Mic permission denied:', reason);
            return { granted: false, reason };
        }
    }

    // CRITICAL: Creates a FRESH SpeechRecognition instance on every listen() call.
    // Reusing the same instance causes lockups on Android/iOS mobile browsers.
    _createRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = this.language;
        rec.continuous = false;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        return rec;
    }

    speak(text) {
        return new Promise((resolve) => {
            if (!this.synthesis) { resolve(); return; }
            this.synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.language;
            utterance.rate = 1.1;
            utterance.pitch = 1.0;

            const doSpeak = () => {
                const voices = this.synthesis.getVoices();
                const spanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('female'))
                    || voices.find(v => v.lang.startsWith('es'));
                if (spanishVoice) utterance.voice = spanishVoice;
                this.onStateChange('speaking');
                utterance.onend = () => { this.onStateChange('idle'); resolve(); };
                utterance.onerror = () => { this.onStateChange('idle'); resolve(); };
                this.synthesis.speak(utterance);
            };

            // Voices may not be loaded yet on mobile — wait if needed
            if (this.synthesis.getVoices().length === 0) {
                this.synthesis.onvoiceschanged = () => doSpeak();
            } else {
                doSpeak();
            }
        });
    }

    listen() {
        return new Promise((resolve, reject) => {
            if (!this._hasSpeechRecognition) {
                reject(new Error('no_recognition'));
                return;
            }

            // Fresh instance every time — essential for mobile
            const recognition = this._createRecognition();
            this._activeRecognition = recognition;
            let settled = false;
            let timeoutId = null;

            const settle = (fn) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                this.onStateChange('idle');
                fn();
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                settle(() => {
                    this.onStateChange('processing');
                    resolve(transcript);
                });
            };

            recognition.onerror = (event) => {
                console.warn('[VoiceChatbot] Recognition error:', event.error);
                settle(() => reject(new Error(event.error)));
            };

            recognition.onend = () => {
                // This fires after recognition ends, either with or without result.
                // settle() is idempotent — if onresult already ran, this is a no-op.
                settle(() => reject(new Error('no_speech_detected')));
            };

            recognition.onaudiostart = () => {
                console.log('[VoiceChatbot] Hardware mic is ACTIVE (audio started)');
                this.onStateChange('listening');
            };

            this.onStateChange('preparing');
            console.log('[VoiceChatbot] Requesting recognition start...');
            try {
                recognition.start();
            } catch (e) {
                settle(() => reject(new Error('recognition_start_failed')));
                return;
            }

            // Safety net: if the browser never fires onend (rare mobile bug), reject after timeout
            timeoutId = setTimeout(() => {
                try { recognition.abort(); } catch (e) { /* ignore */ }
                settle(() => reject(new Error('timeout')));
            }, 7000);
        });
    }

    stop() {
        if (this.synthesis) this.synthesis.cancel();
        if (this._activeRecognition) {
            try { this._activeRecognition.abort(); } catch (e) { }
            this._activeRecognition = null;
        }
        this.onStateChange('idle');
    }
}
