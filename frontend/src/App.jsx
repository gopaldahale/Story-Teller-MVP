import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import ImageUpload from "./ImageUpload";
import StoryPlayer from "./StoryPlayer";
import "./index.css";
import "./App.css";

export default function App(){
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [inputText, setInputText] = useState("");
  const [processedStory, setProcessedStory] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);

  // Determine API URL: use localhost for local dev, empty string for production (relative paths)
  const apiUrl = import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV ? "http://localhost:4040" : "");

  // Handle image upload and text extraction/processing
  const handleExtractAndProcess = async () => {
    if (!imageDataUrl && !inputText.trim()) {
      alert("Please upload an image or enter text");
      return;
    }

    // If image is provided, extract from image
    if (imageDataUrl) {
      await handleImageExtraction();
    } 
    // If text is provided (and no image), process text directly
    else if (inputText.trim()) {
      await handleTextProcessing();
    }
  };

  // Extract and process from image
  const handleImageExtraction = async () => {

    setLoadingExtract(true);
    setProcessedStory(null);
    setExtractedText(null);
    setAudioData(null);
    
    try {
      const resp = await fetch(`${apiUrl}/api/extract-and-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl })
      });
      
      const text = await resp.text();
      
      if (!text) {
        throw new Error("Empty response from server");
      }
      
      const contentType = resp.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new Error(`Unexpected content type: ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      if (!resp.ok) {
        const errorMessage = json?.error || `Server error: ${resp.status} ${resp.statusText}`;
        throw new Error(errorMessage);
      }
      
      setExtractedText(json.extractedText);
      setProcessedStory(json.processedStory);
    } catch (err) {
      console.error("Error:", err);
      const errorMsg = err.message || "An unexpected error occurred";
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoadingExtract(false);
    }
  };

  // Process text directly (no image)
  const handleTextProcessing = async () => {
    setLoadingExtract(true);
    setProcessedStory(null);
    setExtractedText(null);
    setAudioData(null);
    
    try {
      const resp = await fetch(`${apiUrl}/api/process-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText })
      });
      
      const text = await resp.text();
      
      if (!text) {
        throw new Error("Empty response from server");
      }
      
      const contentType = resp.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new Error(`Unexpected content type: ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      if (!resp.ok) {
        const errorMessage = json?.error || `Server error: ${resp.status} ${resp.statusText}`;
        throw new Error(errorMessage);
      }
      
      setProcessedStory(json.processedStory);
    } catch (err) {
      console.error("Error:", err);
      const errorMsg = err.message || "An unexpected error occurred";
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoadingExtract(false);
    }
  };

  // Handle voice generation with Eleven Labs
  const handleGenerateVoice = async () => {
    if (!processedStory) {
      alert("Please process text or image first");
      return;
    }

    setLoadingVoice(true);
    setAudioData(null);
    
    try {
      const resp = await fetch(`${apiUrl}/api/generate-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: processedStory })
      });
      
      const text = await resp.text();
      
      if (!text) {
        throw new Error("Empty response from server");
      }
      
      const contentType = resp.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      if (!resp.ok) {
        const errorMessage = json?.error || `Server error: ${resp.status} ${resp.statusText}`;
        
        if (resp.status === 429) {
          throw new Error(errorMessage || "Service is temporarily unavailable due to high demand. Please wait a moment and try again.");
        }
        
        throw new Error(errorMessage);
      }
      
      setAudioData({
        audioBase64: json.audioBase64,
        audioMime: json.audioMime
      });
    } catch (err) {
      console.error("Error:", err);
      const errorMsg = err.message || "An unexpected error occurred";
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoadingVoice(false);
    }
  };

  return (
    <>
      <Header />
      <div className="app-container">
        <div className="app">
          <ImageUpload
            imageDataUrl={imageDataUrl}
            onChange={setImageDataUrl}
          />

          <div className="controls">
            <textarea
              value={inputText}
              onChange={(e)=>setInputText(e.target.value)}
              placeholder="Or enter text directly (optional if using image)..."
              rows={5}
            />
            <button 
              onClick={handleExtractAndProcess} 
              disabled={loadingExtract || (!imageDataUrl && !inputText.trim())}
              className="extract-button"
            >
              {loadingExtract 
                ? (imageDataUrl ? "Extracting & Processing..." : "Processing...") 
                : (imageDataUrl ? "Extract Text & Process" : "Process Text")}
            </button>
          </div>

          {extractedText && (
            <div className="extracted-text-section">
              <h3>Extracted Text (Raw)</h3>
              <div className="text-preview">
                <p>{extractedText}</p>
              </div>
            </div>
          )}

          {processedStory && (
            <div className="processed-story-section">
              <h3>✨ Generated Story</h3>
              <div className="story-text-display">
                <p>{processedStory}</p>
              </div>
              <button 
                onClick={handleGenerateVoice} 
                disabled={loadingVoice}
                className="voice-button"
              >
                {loadingVoice ? "Generating Voiceover..." : "Send to Eleven Labs for Voiceover"}
              </button>
            </div>
          )}

          {audioData && processedStory && (
            <StoryPlayer
              imageDataUrl={imageDataUrl}
              storyText={processedStory}
              audioBase64={audioData.audioBase64}
              audioMime={audioData.audioMime}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
