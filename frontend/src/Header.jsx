import React from "react";
import "./Header.css";

export default function Header() {
  return (
    <header className="app-header">
      <div className="logo-container">
        <svg
          className="logo"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Open book base */}
          <path
            d="M20 35 L60 20 L100 35 L100 85 L60 100 L20 85 Z"
            fill="url(#bookGradient)"
            stroke="url(#strokeGradient)"
            strokeWidth="2"
          />
          
          {/* Book pages/center line */}
          <line x1="60" y1="20" x2="60" y2="100" stroke="url(#strokeGradient)" strokeWidth="1.5" opacity="0.6" />
          
          {/* Sparkle stars representing AI/magic */}
          <circle cx="35" cy="45" r="3" fill="url(#sparkleGradient)" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="85" cy="50" r="2.5" fill="url(#sparkleGradient)" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="45" cy="70" r="2" fill="url(#sparkleGradient)" opacity="0.7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="75" cy="75" r="2.5" fill="url(#sparkleGradient)" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
          </circle>
          
          {/* Text lines on book pages */}
          <line x1="28" y1="52" x2="52" y2="52" stroke="url(#strokeGradient)" strokeWidth="1" opacity="0.3" />
          <line x1="28" y1="58" x2="48" y2="58" stroke="url(#strokeGradient)" strokeWidth="1" opacity="0.3" />
          <line x1="68" y1="55" x2="92" y2="55" stroke="url(#strokeGradient)" strokeWidth="1" opacity="0.3" />
          <line x1="68" y1="62" x2="88" y2="62" stroke="url(#strokeGradient)" strokeWidth="1" opacity="0.3" />
          
          {/* Gradients */}
          <defs>
            <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="header-title-group">
        <h1 className="app-title">Storytelling AI</h1>
        <p className="app-subtitle">MVP</p>
      </div>
    </header>
  );
}

