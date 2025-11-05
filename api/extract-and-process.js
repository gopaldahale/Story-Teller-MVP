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

/**
 * Vercel Serverless Function Handler
 * POST /api/extract-and-process
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
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
}

