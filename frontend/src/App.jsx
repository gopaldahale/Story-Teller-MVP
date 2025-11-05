import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import ImageUpload from "./ImageUpload";
import StoryPlayer from "./StoryPlayer";
import "./index.css";
import "./App.css";

export default function App(){
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [storyResult, setStoryResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "/api/generate";
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description })
      });
      
      // Read response as text first to check if it's empty
      const text = await resp.text();
      
      if (!text) {
        throw new Error("Empty response from server");
      }
      
      // Check content type
      const contentType = resp.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        throw new Error(`Unexpected content type: ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
      // Parse JSON
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
      
      if (!resp.ok) {
        const errorMessage = json?.error || `Server error: ${resp.status} ${resp.statusText}`;
        
        // Special handling for rate limit errors
        if (resp.status === 429) {
          throw new Error(errorMessage || "Service is temporarily unavailable due to high demand. Please wait a moment and try again.");
        }
        
        throw new Error(errorMessage);
      }
      setStoryResult(json);
    } catch (err) {
      console.error("Error:", err);
      // Show a more user-friendly alert with better formatting
      const errorMsg = err.message || "An unexpected error occurred";
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
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
              value={description}
              onChange={(e)=>setDescription(e.target.value)}
              placeholder="Enter a story idea or topic..."
              rows={5}
            />
            <button onClick={handlePlay} disabled={loading || !description.trim()}>
              {loading ? "Generating story & audio..." : "Generate Story & Audio"}
            </button>
          </div>

          {storyResult && (
            <StoryPlayer
              imageDataUrl={imageDataUrl}
              storyText={storyResult.text}
              audioBase64={storyResult.audioBase64}
              audioMime={storyResult.audioMime}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
