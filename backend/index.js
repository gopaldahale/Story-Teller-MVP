import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readable } from "stream";

dotenv.config();

const app = express();

// Secure CORS configuration - only allow frontend domain
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    // Add your production frontend URL here
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: "10mb" }));

// Initialize ElevenLabs client - it will read ELEVENLABS_API_KEY from environment automatically
const elevenlabs = new ElevenLabsClient();

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Helper function to convert base64 to Gemini format
function base64ToGeminiFormat(base64String) {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const mimeMatch = base64String.match(/^data:image\/(\w+);base64/);
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeMatch ? `image/${mimeMatch[1]}` : 'image/png'
    }
  };
}

// POST /api/extract-and-process - Extract text from image and process with Gemini
app.post("/api/extract-and-process", async (req, res) => {
    console.log("POST /api/extract-and-process request received");
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ 
                error: "Image is required. Please upload an image." 
            });
        }

        console.log("Processing image with Gemini Vision...");

        // Step 1: Extract text from image using Gemini Vision
        let extractedText;
        try {
            // Use gemini-1.5-pro which supports vision, or gemini-2.0-flash which also supports vision
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = "Extract all text from this image. Return only the text content, nothing else.";
            
            const imagePart = base64ToGeminiFormat(image);
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            extractedText = response.text();
            console.log("Text extracted successfully, length:", extractedText.length, "chars");
        } catch (extractErr) {
            console.error("Text extraction error:", extractErr);
            throw new Error(`Failed to extract text from image: ${extractErr.message}`);
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({ 
                error: "No text could be extracted from the image. Please try a different image." 
            });
        }

        console.log("Extracted text preview:", extractedText.substring(0, 100) + "...");

        // Step 2: Generate story from extracted text using Gemini
        console.log("Generating story from extracted text with Gemini...");
        let processedStory;
        try {
            // Sanitize extracted text to prevent prompt injection
            const sanitizedText = sanitizeInput(extractedText);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Write a very short, engaging story based on this idea extracted from an image: "${sanitizedText}". 
Include natural dialogues between characters, proper narrative flow, and make it interesting. 
Keep it under 20 words and make it suitable for text-to-speech reading. 
Don't include markdown formatting or special characters, just plain text with dialogue.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            processedStory = response.text();
            console.log("Story processed successfully, length:", processedStory.length, "chars");
        } catch (processErr) {
            console.error("Text processing error:", processErr);
            throw new Error(`Failed to process text: ${processErr.message}`);
        }

        console.log("Processed story preview:", processedStory.substring(0, 150) + "...");

        // Return the processed story text (no audio yet)
        res.json({
            extractedText: extractedText,
            processedStory: processedStory
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
});

// POST /api/process-text - Process text directly with Gemini (no image extraction)
app.post("/api/process-text", async (req, res) => {
    console.log("POST /api/process-text request received");
    try {
        const { text } = req.body;
        const inputText = text?.trim() || "";
        
        if (!inputText) {
            return res.status(400).json({ 
                error: "Text is required. Please provide text to process." 
            });
        }

        console.log("Processing text with Gemini...");
        console.log("Input text preview:", inputText.substring(0, 100) + "...");

        // Generate story from text input using Gemini
        let processedStory;
        try {
            // Sanitize input to prevent prompt injection
            const sanitizedInput = sanitizeInput(inputText);
            if (!sanitizedInput || sanitizedInput.length === 0) {
                return res.status(400).json({ 
                    error: "Invalid input. Please provide valid text to process." 
                });
            }
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Write a very short, engaging story based on this idea: "${sanitizedInput}". 
Include natural dialogues between characters, proper narrative flow, and make it interesting. 
Keep it under 20 words and make it suitable for text-to-speech reading. 
Don't include markdown formatting or special characters, just plain text with dialogue.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            processedStory = response.text();
            console.log("Story processed successfully, length:", processedStory.length, "chars");
        } catch (processErr) {
            console.error("Text processing error:", processErr);
            throw new Error(`Failed to process text: ${processErr.message}`);
        }

        console.log("Processed story preview:", processedStory.substring(0, 150) + "...");

        // Return the processed story text (no audio yet)
        res.json({
            processedStory: processedStory
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
});

// POST /api/generate-voice - Generate audio from story text using Eleven Labs
app.post("/api/generate-voice", async (req, res) => {
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
});

// POST /api/generate
app.post("/api/generate", async (req, res) => {
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
            // Sanitize input to prevent prompt injection
            const sanitizedInput = sanitizeInput(userInput);
            if (!sanitizedInput || sanitizedInput.length === 0) {
                return res.status(400).json({ 
                    error: "Invalid input. Please provide valid text." 
                });
            }
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const prompt = `Write a very short, engaging story based on this idea: "${sanitizedInput}". 
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
        res.json({
            text: generatedStory,
            audioBase64,
            audioMime: "audio/mpeg"
        });
        console.log("Response sent successfully");

    } catch (err) {
        console.error("Server error:", err);
        // Ensure we always send a JSON response, even if something goes wrong
        if (!res.headersSent) {
            const errorMessage = err.message || "Internal server error";
            res.status(500).json({ 
                error: errorMessage,
                details: process.env.NODE_ENV === "development" ? err.stack : undefined
            });
        }
    }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Catch-all error handler for Express
app.use((err, req, res, next) => {
    console.error('Express error handler:', err);
    if (!res.headersSent) {
        // Never expose error details to clients - security risk
        res.status(500).json({ 
            error: "Internal server error" 
        });
    }
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
