import React from "react";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-thanks">
          Thank you for using Storytelling AI! We hope you enjoyed creating magical stories.
        </p>
        <p className="footer-copyright">
          © {currentYear} <span className="copyright-name">Gopal Dahale</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

