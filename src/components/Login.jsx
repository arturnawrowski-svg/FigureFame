import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'
import { X as XIcon } from 'lucide-react'

export default function Login({ onClose }) {
  const handleXLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'x',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="animate-fade-in">
      <div style={{ background: 'var(--color-bg-shelf)', padding: '2.5rem', borderRadius: '24px', width: '420px', border: '1px solid var(--color-glass-border)', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'var(--color-text-main)', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
          <XIcon size={24}/>
        </button>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-highlight)' }}>Dołącz do społeczności</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>Logując się, zyskujesz możliwość dodawania i oceniania figurek oraz udziału w rankingach!</p>
        
        {/* Custom Twitter/X button */}
        <button
          onClick={handleXLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '10px 16px',
            marginBottom: '10px',
            background: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Twitter bird logo */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
          <span style={{ opacity: 0.5, fontSize: '16px' }}>/</span>
          {/* X (new) logo */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Zaloguj z Twitter / X</span>
        </button>

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
          providers={['google', 'discord']}
          redirectTo={window.location.origin}
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

