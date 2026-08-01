import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <App />
            {/* Licznik odwiedzin. Wewnątrz BrowserRouter, żeby widział zmiany trasy
                (bez tego liczyłby tylko pierwsze wejście, a Gablota to jedna aplikacja).
                Nie stawia ciasteczek i nie zbiera danych osobowych — nie wymaga zgody. */}
            <Analytics />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
