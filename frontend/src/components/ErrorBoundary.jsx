import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
          <div
            style={{
              background: '#fff',
              border: '1.5px solid #fecdd3',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={28} color="#e11d48" />
              <h2 style={{ margin: 0, color: '#9f1239', fontSize: '1.25rem' }}>
                Something went wrong in this view
              </h2>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              The application encountered an unexpected runtime error. You can refresh the view or return to the main dashboard.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#b91c1c',
                  marginBottom: '1.5rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>
              <button
                onClick={() => { window.location.href = '/admin/dashboard'; }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Home size={15} />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
