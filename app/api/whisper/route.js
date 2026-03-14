import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
        }

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Prepare form data for Groq Whisper API
        const groqFormData = new FormData();
        groqFormData.append('file', audioFile, 'audio.webm');
        groqFormData.append('model', 'whisper-large-v3');
        groqFormData.append('language', 'es');
        groqFormData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: groqFormData,
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Groq Whisper error:', errText);
            return NextResponse.json({ error: 'Whisper API error', details: errText }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json({ transcript: data.text });

    } catch (error) {
        console.error('Whisper transcription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
