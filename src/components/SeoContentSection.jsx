import React, { useState } from 'react';

const FAQS = [
  {
    question: "How does AirLink work?",
    answer: "AirLink connects two browsers directly. Once you share your 6-digit Desk ID or QR code, files travel straight between your devices without ever being uploaded to any cloud server."
  },
  {
    question: "Is it safe and private?",
    answer: "Yes. All transfers are end-to-end encrypted (WebRTC DTLS/SRTP). Your files travel directly between your devices and are never stored or seen by anyone else."
  },
  {
    question: "Are there any file size limits?",
    answer: "No. You can transfer files of any size — photos, large 4K videos, or archives — without arbitrary limits."
  },
  {
    question: "Do I need to install any app or extension?",
    answer: "No. AirLink runs directly inside any modern web browser on your phone, tablet, or PC (Chrome, Safari, Firefox, Edge)."
  }
];

export default function SeoContentSection() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(prev => prev === idx ? null : idx);
  };

  return (
    <section className="seo-section" aria-label="About AirLink File Sharing">
      {/* What is AirLink */}
      <div className="seo-about-card">
        <h3 className="seo-section-title">What is AirLink?</h3>
        <p className="seo-about-desc">
          AirLink is a simple, private way to transfer files and share clipboard text or messages directly between devices using your web browser. Just open AirLink on both devices, connect with a 6-digit code or QR code, and send photos, videos, links, or notes instantly. No sign-ups, no file size limits, and your data never touches any cloud storage.
        </p>
      </div>

      {/* 3 Simple Steps */}
      <div className="seo-workflow">
        <h3 className="seo-section-title">How It Works</h3>
        <div className="workflow-grid">
          <div className="workflow-card">
            <div className="workflow-step-num">1</div>
            <h4>Share Code</h4>
            <p>Share your 6-digit Desk ID or show your QR code.</p>
          </div>
          <div className="workflow-card">
            <div className="workflow-step-num">2</div>
            <h4>Connect</h4>
            <p>Enter the code on the other device to link directly.</p>
          </div>
          <div className="workflow-card">
            <div className="workflow-step-num">3</div>
            <h4>Transfer &amp; Chat</h4>
            <p>Drop files or send text and clipboard info at full speed.</p>
          </div>
        </div>
      </div>

      {/* Why AirLink - Simple, punchy highlights */}
      <div className="seo-features">
        <h3 className="seo-section-title">Why AirLink?</h3>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <div className="feature-text">
              <h4>100% Private</h4>
              <p>Direct peer-to-peer transfer. No files or chats saved on servers.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <div className="feature-text">
              <h4>No Size Limits</h4>
              <p>Send large videos, archives, or folders with no file caps.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <div className="feature-text">
              <h4>Chat &amp; Clipboard</h4>
              <p>Instantly share copied text, links, and notes between phone and PC.</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <div className="feature-text">
              <h4>No App Needed</h4>
              <p>Works in any browser on mobile, laptop, and desktop.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="seo-faq">
        <h3 className="seo-section-title">Frequently Asked Questions</h3>
        <div className="faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button 
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span className={`faq-arrow ${isOpen ? 'rotated' : ''}`}>▼</span>
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
