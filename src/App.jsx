import { Routes, Route, useNavigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import Navbar from './components/Navbar'
import ParticleHero from './components/AnimatedHero'
import ProtectedRoute from './components/ProtectedRoute'
import About from './components/About'
import Faq from './components/Faq'
import NotFound from './components/NotFound'
import ScrollToTop from './components/ScrollToTop'

// Ekrany po zalogowaniu doczytujemy dopiero przy wejściu na nie.
// Wcześniej KAŻDY odwiedzający (także na telefonie) pobierał cały panel
// moderatora razem z biblioteką do usuwania tła — kilkaset kilobajtów kodu,
// z którego nigdy nie skorzysta.
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const AddFigure = lazy(() => import('./components/AddFigure'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))

function Loading() {
  return <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>Ładowanie…</div>
}

function App() {
  const navigate = useNavigate()

  return (
    <div className="app-container">
      <ScrollToTop />
      <Navbar />
      <ParticleHero onTitleClick={() => navigate('/')} />

      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Showcase />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            {/* Stały adres figurki — to on trafia pod filmy na TikToka i YouTube'a.
                Przyjmuje czytelny adres (izumi-konata-clayz-1-8) oraz krótki kod
                wypalany w obrazie shorta (7K2M). */}
            <Route path="/f/:key" element={<Dossier />} />
            {/* Stara postać adresu. Filmy i linki wypuszczone wcześniej muszą
                działać dalej, więc nie kasujemy jej — przekierowujemy. */}
            <Route path="/dossier/:key" element={<Dossier />} />
            {/* Dodawanie figurek wymaga potwierdzonego adresu. Logowanie przez
                Google/Discorda/X spełnia ten warunek od razu — dostawca już go
                sprawdził. Bramka dotyczy realnie tylko rejestracji hasłem. */}
            <Route path="/add" element={<ProtectedRoute wymagaPotwierdzenia><AddFigure /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="app-footer">
        <div className="footer-left">2026 Copyright by FigureFame.com</div>
        <div className="footer-right">Created by <a href="mailto:artur.nawrowski@gmail.com">ArChi</a></div>
      </footer>
    </div>
  )
}

export default App
