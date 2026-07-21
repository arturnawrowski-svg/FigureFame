import { Routes, Route, useNavigate } from 'react-router-dom'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import AddFigure from './components/AddFigure'
import AdminDashboard from './components/AdminDashboard'
import ProfilePage from './components/ProfilePage'
import Navbar from './components/Navbar'
import ParticleHero from './components/AnimatedHero'
import ProtectedRoute from './components/ProtectedRoute'
import About from './components/About'
import Faq from './components/Faq'
import NotFound from './components/NotFound'
import ScrollToTop from './components/ScrollToTop'

function App() {
  const navigate = useNavigate()

  return (
    <div className="app-container">
      <ScrollToTop />
      <Navbar />
      <ParticleHero onTitleClick={() => navigate('/')} />

      <main>
        <Routes>
          <Route path="/" element={<Showcase />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/dossier/:id" element={<Dossier />} />
          <Route path="/add" element={<ProtectedRoute><AddFigure /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="footer-left">2026 Copyright by Klara Julia Nawrowska</div>
        <div className="footer-right">Created by <a href="mailto:artur.nawrowski@gmail.com">ArChi</a></div>
      </footer>
    </div>
  )
}

export default App
