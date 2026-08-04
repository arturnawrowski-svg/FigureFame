import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import StronaPostaci from './components/StronaPostaci'
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
import ChatKatalogu from './components/ChatKatalogu'

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

// Strony, które umieją pokazać się na dwa sposoby: jako zwykły adres i jako
// okno nad Gablotą. Jedno miejsce zamiast czterech bliźniaczych bloków —
// dopisanie wiersza wystarczy, żeby nowa strona działała w obu trybach.
// Warunek dla komponentu treści: musi przyjmować `wOknie`.
const OKNA = [
  { sciezka: '/prywatnosc', tytul: 'Polityka prywatności', Tresc: PolitykaPrywatnosci },
  { sciezka: '/regulamin', tytul: 'Regulamin serwisu', Tresc: Regulamin },
  { sciezka: '/o-aplikacji', tytul: 'O aplikacji FigureFame', Tresc: About },
  { sciezka: '/faq', tytul: 'FAQ i poradnik kolekcjonera', Tresc: Faq },
]

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
            {/* Adresy dokumentów są po polsku — tak jak /prywatnosc i /regulamin.
                Wcześniej ta jedna trasa wyłamywała się jako /about.
                Zmienione PRZED premierą, kiedy nikt jeszcze nie linkuje: po
                premierze ta sama zmiana kosztuje przekierowanie utrzymywane
                w nieskończoność i czekanie, aż Google przeindeksuje.
                Myślnik, bo Google traktuje go jako granicę słów — „oaplikacji"
                byłoby dla wyszukiwarki jednym nieznanym ciągiem znaków.
                /faq zostaje: to skrót wyszukiwany po polsku tak samo. */}
            <Route path="/o-aplikacji" element={<About />} />
            {/* Stary adres. Nic go dziś nie używa, ale dwie linijki zdejmują
                całe ryzyko, gdyby gdzieś jednak poszedł. */}
            <Route path="/about" element={<Navigate to="/o-aplikacji" replace />} />
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
            {/* Strona POSTACI — wszystkie jej figurki naraz. Karta pojedynczego
                produktu nie wygra frazy „Super Sonico figurka", bo mówi o jednym
                wydaniu; ta strona mówi o wszystkich. Adres po polsku, jak reszta. */}
            <Route path="/postac/:slug" element={<StronaPostaci />} />
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

      {/* Czat montowany RAZ, dla całej aplikacji. Przyciski w nagłówku, stopce
          i przy figurce nie trzymają go u siebie — wywołują zdarzenie
          `open-chat`, a ono trafia tutaj. Dzięki temu rozmowa nie ginie przy
          przejściu między stronami. */}
      <ChatKatalogu />

      {/* Warstwa okien. Rysowana TYLKO gdy przyszliśmy z `tlo` — czyli
          kliknięciem wewnątrz serwisu. Zamknięcie to `navigate(-1)`:
          wraca do strony pod spodem i zdejmuje adres dokumentu z historii,
          więc przycisk „wstecz" zachowuje się tak, jak człowiek oczekuje. */}
      {tlo && (
        <Routes>
          {OKNA.map(({ sciezka, tytul, Tresc }) => (
            <Route
              key={sciezka}
              path={sciezka}
              element={
                <OknoDokumentu tytul={tytul} onClose={() => navigate(-1)}>
                  <Tresc wOknie />
                </OknoDokumentu>
              }
            />
          ))}
        </Routes>
      )}
    </div>
  )
}

export default App
