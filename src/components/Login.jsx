import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'
import { X } from 'lucide-react'

export default function Login({ onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#1a1c23', padding: '3rem', borderRadius: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#fff', opacity: 0.5, border: 'none', cursor: 'pointer' }}>
          <X size={24}/>
        </button>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Zaloguj się do Gabloty</h2>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="dark"
        />
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
            Możesz założyć nowe konto lub zalogować się jako administrator (najpierw go zarejestruj):
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold', fontSize: '0.9rem' }}>admin@figurefame.com / admin1234</p>
        </div>
      </div>
    </div>
  )
}
