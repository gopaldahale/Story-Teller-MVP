import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readable } from "stream";

// Initialize ElevenLabs client - it will read ELEVENLABS_API_KEY from environment automatically
const elevenlabs = new ElevenLabsClient();

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Vercel Serverless Function Handler
 * POST /api/generate
 */
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("POST /api/generate request received");
    
    try {
        const { text } = req.body;
        const userInput = text?.trim() || "";
        
        if (!userInput) {
            return res.status(400).json({ 
                error: "Text is required. Please provide a story idea or topic." 
            });
        }

        console.log("User input:", userInput.substring(0, 100) + "...");

        // Generate story with Gemini
        console.log("Generating story with Gemini...");
        let generatedStory;
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Write a very short, engaging story based on this idea: "${userInput}". 
Include natural dialogues between characters, proper narrative flow, and make it interesting. 
Keep it under 20 words and make it suitable for text-to-speech reading. 
Don't include markdown formatting or special characters, just plain text with dialogue.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            generatedStory = response.text();
            console.log("Story generated successfully, length:", generatedStory.length, "chars");
        } catch (geminiErr) {
            console.error("Gemini generation error:", geminiErr);
            throw new Error(`Failed to generate story: ${geminiErr.message}`);
        }

        console.log("Generated story preview:", generatedStory.substring(0, 150) + "...");

        // Generate audio using ElevenLabs TTS
        const voiceId = process.env.ELEVENLABS_VOICE_ID || "jUjRbhZWoMK4aDciW36V"; // Default voice
        console.log("Calling ElevenLabs TTS with voiceId:", voiceId);
        let audioStream;
        try {
            audioStream = await elevenlabs.textToSpeech.convert(
                voiceId,
                {
                    text: generatedStory,
                    modelId: 'eleven_multilingual_v2',
                    outputFormat: 'mp3_44100_128',
                }
            );
            console.log("ElevenLabs response received");
        } catch (ttsErr) {
            console.error("ElevenLabs TTS error:", ttsErr);
            throw new Error(`Failed to generate audio: ${ttsErr.message}`);
        }

        // Check if stream exists
        if (!audioStream) {
            console.error("No audio stream received from ElevenLabs");
            throw new Error("No valid audio stream received from ElevenLabs");
        }

        // Handle the audio stream (convert to buffer for Node.js)
        // Convert Web ReadableStream to Node.js Readable stream if needed
        console.log("Reading audio stream...");
        const chunks = [];
        let nodeStream;
        
        // Check if it's a Web ReadableStream that needs conversion
        if (audioStream instanceof ReadableStream) {
            nodeStream = Readable.fromWeb(audioStream);
        } else {
            // Already a Node.js stream
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
        console.log("Sending response with audio base64 length:", audioBase64.length);
        return res.json({
            text: generatedStory,
            audioBase64,
            audioMime: "audio/mpeg"
        });

    } catch (err) {
        console.error("Server error:", err);
        // Ensure we always send a JSON response, even if something goes wrong
        const errorMessage = err.message || "Internal server error";
        return res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
}
