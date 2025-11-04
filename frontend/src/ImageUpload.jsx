import React, { useRef } from "react";

export default function ImageUpload({ imageDataUrl, onChange }) {
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
      />
      <button
        type="button"
        className="file-upload-button"
        onClick={handleButtonClick}
      >
        {imageDataUrl ? "Change Image" : "Choose Image to Upload"}
      </button>
      {imageDataUrl ? (
        <div className="image-preview">
          <img src={imageDataUrl} alt="uploaded" />
        </div>
      ) : (
        <div className="file-upload-status">No image uploaded yet.</div>
      )}
    </div>
  );
}
