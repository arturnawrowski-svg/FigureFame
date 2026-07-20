import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'
import { X as XIcon } from 'lucide-react'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
  </svg>
)

const DiscordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 00-4.8 0 20.24 20.24 0 00-.54-1.09.1.1 0 00-.07-.03c-1.5.26-2.93.71-4.27 1.33a.1.1 0 00-.05.05C2.79 11.53 1.41 17.5 1.74 23.44a.1.1 0 00.04.07 16.48 16.48 0 004.99 2.52.09.09 0 00.1-.03c.36-.49.69-1.01 1-1.55a.09.09 0 00-.05-.12 10.78 10.78 0 01-1.54-.74.1.1 0 01-.01-.15c.1-.08.21-.15.31-.24a.08.08 0 01.09-.01c3.2 1.46 6.64 1.46 9.8 0a.08.08 0 01.1.01c.1.08.2.16.3.24a.1.1 0 01-.01.15 11 11 0 01-1.55.74.09.09 0 00-.04.12c.3.54.64 1.06 1 1.55a.09.09 0 00.1.03 16.43 16.43 0 004.99-2.52.1.1 0 00.04-.07c.39-6.73-1.42-12.63-2.94-18.06a.09.09 0 00-.05-.05zm-10.87 13.4c-1.09 0-1.98-1.01-1.98-2.25s.88-2.25 1.98-2.25c1.11 0 2 1.02 1.98 2.25 0 1.24-.88 2.25-1.98 2.25zm7.2 0c-1.09 0-1.98-1.01-1.98-2.25s.88-2.25 1.98-2.25c1.11 0 2 1.02 1.98 2.25 0 1.24-.87 2.25-1.98 2.25z"/>
  </svg>
)

const TwitterIcon = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DA1F2">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
    <span style={{ opacity: 0.5, fontSize: '14px' }}>/</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </div>
)

const SocialButton = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
  >
    {icon}
    <span>{label}</span>
  </button>
)

export default function Login({ onClose }) {
  const handleSocialLogin = async (provider) => {
    await supabase.auth.signInWithOAuth({ 
      provider,
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="animate-fade-in">
      <div style={{ background: 'var(--color-bg-shelf)', padding: '2.5rem', borderRadius: '24px', width: '420px', border: '1px solid var(--color-glass-border)', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'var(--color-text-main)', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
          <XIcon size={24}/>
        </button>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-highlight)' }}>Dołącz do społeczności</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>Logując się, zyskujesz możliwość dodawania i oceniania figurek oraz udziału w rankingach!</p>
        
        {/* Unified Custom Social Buttons in Requested Order */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SocialButton 
            onClick={() => handleSocialLogin('google')}
            icon={<GoogleIcon />}
            label="Zaloguj z Google"
          />
          <SocialButton 
            onClick={() => handleSocialLogin('discord')}
            icon={<DiscordIcon />}
            label="Zaloguj z Discord"
          />
          
          <div style={{ height: '8px' }}></div>
          
          <SocialButton 
            onClick={() => handleSocialLogin('x')}
            icon={<TwitterIcon />}
            label="Zaloguj z Twitter / X"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', opacity: 0.3 }}>
          <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
          <span style={{ padding: '0 10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Lub emailem</span>
          <div style={{ flex: 1, height: '1px', background: 'white' }}></div>
        </div>

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
          providers={[]} // Empty array to hide Supabase's native social buttons
          redirectTo={window.location.origin}
          theme="dark"
          localization={{
            variables: {
              sign_up: {
                email_label: 'Adres Email',
                password_label: 'Utwórz Hasło',
                button_label: 'Zarejestruj się',
                link_text: 'Nie masz konta? Zarejestruj się'
              },
              sign_in: {
                email_label: 'Adres Email',
                password_label: 'Hasło',
                button_label: 'Zaloguj się',
                link_text: 'Masz już konto? Zaloguj się'
              }
            }
          }}
        />
      </div>
    </div>
  )
}

