import { Routes, Route, useNavigate } from 'react-router-dom'
import Showcase from './components/Showcase'
import Dossier from './components/Dossier'
import AddFigure from './components/AddFigure'
import AdminDashboard from './components/AdminDashboard'
import ProfilePage from './components/ProfilePage'
import Navbar from './components/Navbar'
import ParticleHero from './components/AnimatedHero'

function App() {
  const navigate = useNavigate()

  return (
    <div className="app-container">
      <Navbar />
      <ParticleHero onTitleClick={() => navigate('/')} />

      <main>
        <Routes>
          <Route path="/" element={<Showcase />} />
          <Route path="/dossier/:id" element={<Dossier />} />
          <Route path="/add" element={<AddFigure />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
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
