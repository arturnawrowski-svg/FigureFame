import UkladDokumentu from './UkladDokumentu';

// ============================================================================
// Polityka prywatności — SZKIC do akceptacji administratora danych.
//
// Tekst opisuje to, co serwis NAPRAWDĘ robi (patrz server-lib/aiClient.js,
// api/delete-account.js, src/lib/supabaseClient.js), a nie wzór z internetu.
// Każda zmiana w przetwarzaniu danych — nowy dostawca, nowe cookies, statystyki —
// musi tu trafić razem z datą.
//
// ⚠️ DO UZUPEŁNIENIA po rejestracji działalności: nazwa firmy, adres, NIP.
// ============================================================================

const DATA = '31 lipca 2026';

const SPIS = [
  { id: 'p1', etykieta: '1. Kto odpowiada za dane' },
  { id: 'p2', etykieta: '2. Jakie dane zbieramy' },
  { id: 'p3', etykieta: '3. Po co i na jakiej podstawie' },
  { id: 'p4', etykieta: '4. Komu je powierzamy' },
  { id: 'p5', etykieta: '5. Jak długo je trzymamy' },
  { id: 'p6', etykieta: '6. Twoje prawa' },
  { id: 'p7', etykieta: '7. Cookies i pamięć przeglądarki' },
  { id: 'p8', etykieta: '8. Zmiany' },
];

export default function PolitykaPrywatnosci({ wOknie = false }) {
  return (
    <UkladDokumentu tytul="Polityka prywatności" data={DATA} spis={SPIS} wOknie={wOknie}>
      <div className="dokument-skrot">
        <span>W skrócie</span>
        <p>
          Zbieramy tyle, ile trzeba, żeby działało logowanie i żebyś mógł dodawać figurki.
          Nie sprzedajemy danych i nie handlujemy nimi. Konto skasujesz sam, w każdej chwili,
          bez pisania do nas.
        </p>
      </div>

      <h2 id="p1">1. Kto odpowiada za dane</h2>
      <p>
        Administratorem danych osobowych jest <strong>Artur Nawrowski</strong>, prowadzący serwis
        FigureFame pod adresem figurefame.com. Kontakt w sprawach danych:{' '}
        <a href="mailto:figurefame@figurefame.com">figurefame@figurefame.com</a>.
      </p>

      <h2 id="p2">2. Jakie dane zbieramy</h2>
      <ul>
        <li>
          <strong>Adres e-mail</strong> — zawsze. Przy rejestracji hasłem podajesz go sam;
          przy logowaniu przez Google, Discorda, X lub Facebooka przekazuje go nam dostawca.
        </li>
        <li>
          <strong>Ustawienia profilu</strong> — nazwa wyświetlana, język, awatar, jeśli je uzupełnisz.
        </li>
        <li>
          <strong>Zgłoszenia figurek</strong> — treści dodane przez Ciebie do bazy wraz z informacją,
          kto je zgłosił.
        </li>
        <li>
          <strong>Dane techniczne</strong> — adres IP i typ przeglądarki w logach serwera.
          Zapisuje je każdy serwer w internecie, także nasz.
        </li>
      </ul>
      <p>
        Nie zbieramy numeru telefonu, adresu zamieszkania ani danych płatniczych. Serwis jest
        bezpłatny i niczego w nim nie sprzedajemy.
      </p>

      <h2 id="p3">3. Po co i na jakiej podstawie</h2>
      <ul>
        <li>
          <strong>Prowadzenie konta i udostępnianie serwisu</strong> — art. 6 ust. 1 lit. b RODO
          (wykonanie umowy o świadczenie usługi drogą elektroniczną).
        </li>
        <li>
          <strong>Bezpieczeństwo, moderacja, zapobieganie nadużyciom</strong> — art. 6 ust. 1 lit. f
          (nasz uzasadniony interes).
        </li>
        <li>
          <strong>Opcjonalne pliki cookies</strong> — art. 6 ust. 1 lit. a (Twoja zgoda), którą
          możesz wycofać w każdej chwili.
        </li>
      </ul>

      <h2 id="p4">4. Komu je powierzamy</h2>
      <p>
        Serwis stoi na usługach zewnętrznych i to one fizycznie przechowują dane:{' '}
        <strong>Supabase</strong> (baza i logowanie, serwery w Unii Europejskiej),{' '}
        <strong>Vercel</strong> (hosting strony), <strong>Brevo</strong> (wysyłka e-maili:
        potwierdzenie adresu, reset hasła), <strong>Google Drive</strong> (kopie zapasowe projektu).
      </p>
      <p>
        <strong>Osobno o asystencie AI.</strong> Gdy pytasz asystenta o figurkę, do dostawcy modelu
        trafia opis figurki i treść Twojego pytania.{' '}
        <strong>Nie wysyłamy tam Twojego adresu e-mail ani identyfikatora konta.</strong>{' '}
        Korzystamy z modeli m.in. Google, Groq, OpenRouter, GitHub, SambaNova i Hugging Face;
        część z nich przetwarza dane poza Europejskim Obszarem Gospodarczym, na standardowych
        klauzulach umownych zatwierdzonych przez Komisję Europejską.
      </p>

      <h2 id="p5">5. Jak długo je trzymamy</h2>
      <p>
        Dane konta — do czasu jego usunięcia. Zgłoszone przez Ciebie figurki{' '}
        <strong>zostają w bazie także po usunięciu konta</strong>, ale tracą powiązanie z Tobą:
        opiekę nad wpisem przejmuje moderator. Jest tak dlatego, że wpis staje się częścią wspólnej
        bazy, z której korzystają inni. Logi serwera — zgodnie z zasadami dostawcy hostingu.
      </p>

      <h2 id="p6">6. Twoje prawa</h2>
      <p>
        Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia
        przetwarzania, sprzeciwu wobec przetwarzania oraz przeniesienia danych. Przysługuje Ci też
        skarga do <strong>Prezesa Urzędu Ochrony Danych Osobowych</strong>.
      </p>
      <p>
        <strong>Usunięcie konta działa od ręki i nie wymaga pisania do nas</strong> — Profil →
        Usuń konto. Operacja jest nieodwracalna i wymaga przepisania hasła, żeby nie dało się jej
        wykonać przypadkiem.
      </p>

      <h2 id="p7">7. Cookies i pamięć przeglądarki</h2>
      <p>
        Żeby dało się być zalogowanym, trzymamy Twoją sesję w pamięci lokalnej przeglądarki
        (<code>localStorage</code>). To element <strong>niezbędny do działania</strong> logowania —
        bez niego wylogowywałoby Cię przy każdym kliknięciu — i zgodnie z przepisami nie wymaga zgody.
      </p>
      <p>
        Nie prowadzimy dziś statystyk odwiedzin ani reklam. Gdy dołożymy filmy osadzone
        z YouTube&apos;a albo narzędzia marketingowe, pojawią się cookies opcjonalne, a wraz z nimi
        panel wyboru. <strong>Dopóki nie ma czego wybierać, nie udajemy, że jest.</strong>
      </p>

      <h2 id="p8">8. Zmiany</h2>
      <p>
        Data ostatniej aktualizacji stoi na górze dokumentu. O istotnych zmianach uprzedzimy
        na stronie głównej.
      </p>
    </UkladDokumentu>
  );
}
