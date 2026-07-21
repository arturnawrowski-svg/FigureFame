import { Component } from 'react';

// ============================================================================
// ErrorBoundary — łapie nieoczekiwane błędy renderowania Reacta i pokazuje
// łagodny ekran zamiast białej strony. Klasowy komponent (wymóg API React).
// ============================================================================

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Nieznany błąd' };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary złapał błąd:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', color: 'var(--color-text-highlight, #eee)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😵‍💫</div>
          <h1 style={{ margin: '0 0 0.5rem' }}>Coś poszło nie tak</h1>
          <p style={{ opacity: 0.75, maxWidth: '420px', lineHeight: 1.6 }}>
            Wystąpił nieoczekiwany błąd. Możesz wrócić do strony głównej i spróbować ponownie.
          </p>
          <button
            onClick={this.handleReload}
            style={{ marginTop: '1.5rem', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: 'var(--color-text-highlight, #f59e0b)', color: 'var(--color-bg-shelf, #111)' }}
          >
            Wróć do Gabloty
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
