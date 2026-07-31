import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
import Footer from './components/Footer'
import OknoDokumentu from './components/OknoDokumentu'
import PolitykaPrywatnosci from './components/PolitykaPrywatnosci'
import Regulamin from './components/Regulamin'

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
  const location = useLocation()

  // OKNO NAD STRONĄ, ale z prawdziwym adresem.
  //
  // Odnośniki w stopce niosą `state.tlo` — czyli stronę, która ma zostać pod
  // spodem. Gdy `tlo` jest, trasy pod spodem renderujemy dla NIEJ, a dokument
  // pokazujemy w oknie. Gdy `tlo` nie ma (wejście wprost na /prywatnosc,
  // odświeżenie, link z Google) — zwyczajna pełna strona.
  //
  // Dzięki temu polityka prywatności ma stały adres, którego wymagają programy
  // afiliacyjne i wyszukiwarki, a mimo to nie wyrzuca czytelnika z Gabloty.
  const tlo = location.state?.tlo

  return (
    <div className="app-container">
      <ScrollToTop />
      <Navbar />
      <ParticleHero onTitleClick={() => navigate('/')} />

      <main>
        <Suspense fallback={<Loading />}>
          <Routes location={tlo || location}>
            <Route path="/" element={<Showcase />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            {/* Dokumenty prawne. Muszą mieć własne, stałe adresy — sprawdzają je
                programy afiliacyjne, a od 2026 wskazuje na nie panel zgód. */}
            <Route path="/prywatnosc" element={<PolitykaPrywatnosci />} />
            <Route path="/regulamin" element={<Regulamin />} />
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

      <Footer />

      {/* Warstwa okien. Rysowana TYLKO gdy przyszliśmy z `tlo` — czyli
          kliknięciem wewnątrz serwisu. Zamknięcie to `navigate(-1)`:
          wraca do strony pod spodem i zdejmuje adres dokumentu z historii,
          więc przycisk „wstecz" zachowuje się tak, jak człowiek oczekuje. */}
      {tlo && (
        <Routes>
          <Route
            path="/prywatnosc"
            element={
              <OknoDokumentu tytul="Polityka prywatności" onClose={() => navigate(-1)}>
                <PolitykaPrywatnosci wOknie />
              </OknoDokumentu>
            }
          />
          <Route
            path="/regulamin"
            element={
              <OknoDokumentu tytul="Regulamin serwisu" onClose={() => navigate(-1)}>
                <Regulamin wOknie />
              </OknoDokumentu>
            }
          />
          <Route
            path="/about"
            element={
              <OknoDokumentu tytul="O aplikacji FigureFame" onClose={() => navigate(-1)}>
                <About wOknie />
              </OknoDokumentu>
            }
          />
        </Routes>
      )}
    </div>
  )
}

export default App
