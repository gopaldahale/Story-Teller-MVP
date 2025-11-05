import { GoogleGenerativeAI } from "@google/generative-ai";

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

/**
 * Vercel Serverless Function Handler
 * POST /api/process-text
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
}

