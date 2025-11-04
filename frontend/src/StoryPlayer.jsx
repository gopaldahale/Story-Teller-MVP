import React, { useRef, useEffect } from "react";

export default function StoryPlayer({ imageDataUrl, storyText, audioBase64, audioMime }) {
  const audioRef = useRef();

  // Convert base64 to blob URL
  const audioUrl = audioBase64
    ? URL.createObjectURL(base64ToBlob(audioBase64, audioMime))
    : null;

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.play().catch(()=>{/* autoplay might be blocked */});
    }
  }, [audioUrl]);

  return (
    <div className="story-player">
      {imageDataUrl && <img src={imageDataUrl} alt="panel" />}
      <div className="story-text">
        <h3>Narration</h3>
        <p>{storyText}</p>
      </div>
      {audioUrl && (
        <audio ref={audioRef} controls>
          <source src={audioUrl} type={audioMime} />
          Your browser does not support audio.
        </audio>
      )}
    </div>
  );
}

function base64ToBlob(base64, mime) {
  const bstr = atob(base64);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
