import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// Dymek: „potwierdź adres, żeby dodawać figurki".
// ----------------------------------------------------------------------------
// Widzi go JEDEN rodzaj użytkownika: ten, kto założył konto hasłem i nie
// kliknął linku z maila. Wchodzący przez Google, Discorda czy X mają adres
// potwierdzony przez dostawcę i nigdy tu nie trafią.
//
// Dlaczego dymek, a nie zwykły komunikat: to strona o figurkach z anime, więc
// forma z komiksu jest u siebie. Ale ma też robotę do wykonania — sucha ramka
// z zakazem czyta się jak kara, dymek jak rozmowa.
//
// Najważniejszy jest tu przycisk „wyślij ponownie". Bez niego to ślepy zaułek:
// pierwszy mail mógł wpaść w spam albo wygasnąć, a człowiek zostaje z
// informacją, czego mu nie wolno, i bez sposobu, żeby to zmienić.
// ============================================================================

// Adres skracamy — ktoś może patrzeć na ekran przez ramię.
function przytnijAdres(adres) {
  const [nazwa, domena] = String(adres || '').split('@');
  if (!domena) return adres || '';
  const widoczne = nazwa.slice(0, 1);
  return `${widoczne}${'*'.repeat(Math.max(nazwa.length - 1, 3))}@${domena}`;
}

export default function PotwierdzAdres({ email }) {
  const navigate = useNavigate();
  const [stan, setStan] = useState('gotowy'); // gotowy | wysylam | wyslany | blad
  const [blad, setBlad] = useState('');

  const zamknij = () => navigate('/', { replace: true });

  const wyslijPonownie = async () => {
    setStan('wysylam');
    setBlad('');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setBlad(error.message);
      setStan('blad');
      return;
    }
    setStan('wyslany');
  };

  return (
    <div className="dymek-tlo" onClick={zamknij}>
      <div className="dymek" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="dymek-tytul">
        <button className="dymek-zamknij" onClick={zamknij} aria-label="Zamknij">
          <X size={20} />
        </button>

        <div className="dymek-ikona" aria-hidden="true"><Mail size={30} /></div>

        <h2 className="dymek-tytul" id="dymek-tytul">Jeszcze jeden krok!</h2>

        <p className="dymek-tresc">
          Wysłaliśmy link na <strong>{przytnijAdres(email)}</strong>.
          Kliknij go, a będziesz mógł dodawać figurki do Gabloty.
        </p>

        {stan === 'wyslany' ? (
          <p className="dymek-udalo">Poszedł! Sprawdź skrzynkę za chwilę.</p>
        ) : (
          <>
            <button className="dymek-przycisk" onClick={wyslijPonownie} disabled={stan === 'wysylam'}>
              <Send size={16} />
              {stan === 'wysylam' ? 'Wysyłam…' : 'Wyślij link ponownie'}
            </button>
            {stan === 'blad' && <p className="dymek-blad">Nie udało się wysłać: {blad}</p>}
          </>
        )}

        <p className="dymek-drobne">Nie widzisz maila? Zajrzyj do folderu ze spamem.</p>
      </div>
    </div>
  );
}
