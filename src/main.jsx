import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '30px', 
          fontFamily: 'system-ui, -apple-system, sans-serif', 
          maxWidth: '560px', 
          margin: '50px auto', 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)' 
        }}>
          <h2 style={{ color: '#e11d48', marginTop: 0, fontSize: '20px', fontWeight: '900' }}>
            ⚠️ Terjadi Kendala Memuat Data
          </h2>
          <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
            Aplikasi mengalami kendala:
          </p>
          <pre style={{ 
            background: '#f8fafc', 
            padding: '12px', 
            borderRadius: '8px', 
            border: '1px solid #cbd5e1', 
            color: '#0f172a', 
            fontSize: '12px', 
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: '10px 18px', 
                background: '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              🔄 Refresh Halaman
            </button>
            <button 
              onClick={this.handleClearAndReload}
              style={{ 
                padding: '10px 18px', 
                background: '#f1f5f9', 
                color: '#334155', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              🗑️ Reset Data & Buka Bersih
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
