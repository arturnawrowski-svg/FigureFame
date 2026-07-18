import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'
import { X } from 'lucide-react'

export default function Login({ onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="animate-fade-in">
      <div style={{ background: 'var(--color-bg-shelf)', padding: '2.5rem', borderRadius: '24px', width: '420px', border: '1px solid var(--color-glass-border)', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'var(--color-text-main)', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
          <X size={24}/>
        </button>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-highlight)' }}>Dołącz do społeczności</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>Logując się, zyskujesz możliwość dodawania i oceniania figurek oraz udziału w rankingach!</p>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4f46e5',
                  brandAccent: '#4338ca',
                  inputBackground: 'rgba(255, 255, 255, 0.05)',
                  inputText: 'white',
                  inputBorder: 'rgba(255, 255, 255, 0.1)',
                  messageText: 'white',
                }
              }
            }
          }}
          providers={['google', 'discord', 'twitter_oauth2']}
          theme="dark"
          localization={{
            variables: {
              sign_up: {
                email_label: 'Adres Email',
                password_label: 'Utwórz Hasło',
                button_label: 'Zarejestruj się',
                social_provider_text: 'Kontynuuj z {{provider}}',
                link_text: 'Nie masz konta? Zarejestruj się'
              },
              sign_in: {
                email_label: 'Adres Email',
                password_label: 'Hasło',
                button_label: 'Zaloguj się',
                social_provider_text: 'Zaloguj z {{provider}}',
                link_text: 'Masz już konto? Zaloguj się'
              }
            }
          }}
        />
      </div>
    </div>
  )
}
