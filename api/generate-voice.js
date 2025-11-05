import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

// Initialize ElevenLabs client - it will read ELEVENLABS_API_KEY from environment automatically
const elevenlabs = new ElevenLabsClient();

// Input sanitization function to prevent prompt injection
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Remove potentially dangerous characters and patterns
    return input
        .replace(/[<>\"'`]/g, '') // Remove HTML/script tags and quotes
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, etc.)
        .replace(/[\r\n]/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 2000); // Max length limit
}

/**
 * Vercel Serverless Function Handler
 * POST /api/generate-voice
 */
export default async function handler(req, res) {
    // Secure CORS - restrict to frontend domain
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
    ].filter(Boolean);
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("POST /api/generate-voice request received");
    try {
        const { text } = req.body;
        const storyText = text?.trim() || "";
        
        if (!storyText) {
            return res.status(400).json({ 
                error: "Story text is required to generate voiceover." 
            });
        }

        // Sanitize story text before sending to ElevenLabs
        const sanitizedStoryText = sanitizeInput(storyText);
        if (!sanitizedStoryText || sanitizedStoryText.length === 0) {
            return res.status(400).json({ 
                error: "Invalid story text. Please provide valid text to generate voiceover." 
            });
        }

        console.log("Generating audio with ElevenLabs for text length:", sanitizedStoryText.length);

        // Generate audio using ElevenLabs TTS
        const voiceId = process.env.ELEVENLABS_VOICE_ID || "jUjRbhZWoMK4aDciW36V";
        console.log("Calling ElevenLabs TTS with voiceId:", voiceId);
        let audioStream;
        try {
            audioStream = await elevenlabs.textToSpeech.convert(
                voiceId,
                {
                    text: sanitizedStoryText,
                    modelId: 'eleven_multilingual_v2',
                    outputFormat: 'mp3_44100_128',
                }
            );
            console.log("ElevenLabs response received");
        } catch (ttsErr) {
            console.error("ElevenLabs TTS error:", ttsErr);
            throw new Error(`Failed to generate audio: ${ttsErr.message}`);
        }

        if (!audioStream) {
            console.error("No audio stream received from ElevenLabs");
            throw new Error("No valid audio stream received from ElevenLabs");
        }

        // Convert stream to buffer
        console.log("Reading audio stream...");
        const chunks = [];
        let nodeStream;
        
        if (audioStream instanceof ReadableStream) {
            nodeStream = Readable.fromWeb(audioStream);
        } else {
            nodeStream = audioStream;
        }
        
        try {
            await new Promise((resolve, reject) => {
                nodeStream.on('data', (chunk) => {
                    chunks.push(Buffer.from(chunk));
                });
                nodeStream.on('end', () => {
                    console.log("Audio stream finished, total chunks:", chunks.length);
                    resolve();
                });
                nodeStream.on('error', (err) => {
                    console.error("Error reading audio stream:", err);
                    reject(err);
                });
            });
        } catch (streamErr) {
            throw new Error(`Failed to read audio stream: ${streamErr.message}`);
        }
        
        if (chunks.length === 0) {
            throw new Error("No audio data received from ElevenLabs");
        }
        
        const audioBuffer = Buffer.concat(chunks);
        console.log("Audio buffer created, size:", audioBuffer.length, "bytes");
        const audioBase64 = audioBuffer.toString("base64");

        // Send back audio
        console.log("Sending response with audio");
        res.json({
            audioBase64,
            audioMime: "audio/mpeg"
        });
        console.log("Response sent successfully");

    } catch (err) {
        console.error("Server error:", err);
        if (!res.headersSent) {
            // Never expose stack traces to clients - security risk
            res.status(500).json({ 
                error: "An error occurred processing your request. Please try again."
            });
        }
    }
}

