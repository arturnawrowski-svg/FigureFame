import { ArrowLeft, HelpCircle, ShieldAlert, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// FAQ + poradnik kolekcjonera — osobna strona (/faq). Statyczna, bez bazy.
// Akordeon oparty o natywne <details>/<summary> (dostępny, bez JS).
// ============================================================================

const FAQ = [
  {
    q: 'Czym jest FigureFame?',
    a: 'To baza danych i agregator informacji o japońskich figurkach kolekcjonerskich. Znajdziesz tu dane figurek, ich wartość rynkową, ocenę ryzyka podróbek (Bootleg Radar) oraz asystenta AI, który pomaga w decyzjach zakupowych.',
  },
  {
    q: 'Czy FigureFame to sklep?',
    a: 'Nie. FigureFame nie sprzedaje figurek — jest bazą wiedzy i przewodnikiem. Docelowo będziemy wskazywać, gdzie kupić daną figurkę (linki do sklepów i aukcji), ale sama transakcja odbywa się poza serwisem.',
  },
  {
    q: 'Czy dane i ceny są pewne?',
    a: 'Traktuj je orientacyjnie. Dane pochodzą ze źródeł kolekcjonerskich i są wspierane przez AI, a ceny na rynku wtórnym mocno się wahają. Zawsze warto zweryfikować konkretną ofertę u sprzedawcy.',
  },
  {
    q: 'Co to jest bootleg (podróbka)?',
    a: 'Bootleg to nieoryginalna, nieautoryzowana kopia figurki. Zwykle ma niższą jakość (malowanie, materiał, pudełko) i bywa sprzedawana w cenie oryginału. Rozpoznanie podróbki chroni Cię przed stratą pieniędzy — patrz poradnik niżej.',
  },
  {
    q: 'Jak działa Bootleg Radar?',
    a: 'To orientacyjna ocena, jak często dany model bywa podrabiany na rynku (na podstawie producenta, popularności serii i typu figurki). Dodatkowo możesz poprosić AI o listę konkretnych cech oryginału. To ocena na poziomie modelu, nie konkretnej oferty.',
  },
  {
    q: 'Czy asystent AI może się mylić?',
    a: 'Tak. AI to pomoc, nie wyrocznia — może się pomylić lub czegoś nie wiedzieć. Jego odpowiedzi mają charakter doradczy. Przy ważnych zakupach zawsze weryfikuj informacje u zaufanych źródeł.',
  },
  {
    q: 'Skąd pochodzą zdjęcia figurek?',
    a: 'Ze zgłoszeń użytkowników oraz źródeł oficjalnych/kolekcjonerskich. Przy dodawaniu zdjęcia wymagane jest oświadczenie o prawie do jego użycia — dbamy o kwestie prawne.',
  },
  {
    q: 'Czy mogę dodać własną figurkę do bazy?',
    a: 'Tak — po zalogowaniu możesz zgłosić figurkę. Trafia ona do weryfikacji przez moderatora, który uzupełnia dane i zatwierdza ją do publicznej Gabloty.',
  },
];

const BOOTLEG_CHECKLIST = [
  ['Cena', 'Zbyt niska względem rynku (np. „oryginał" za ułamek ceny) to główny sygnał ostrzegawczy.'],
  ['Sprzedawca', 'Sprawdź opinie, historię i lokalizację. Masowe „nowe" egzemplarze rzadkiej figurki = podejrzane.'],
  ['Malowanie', 'Podróbki mają przelewy farby, nierówne linie, tańsze wykończenie i inne odcienie niż oryginał.'],
  ['Pudełko', 'Zwróć uwagę na logo producenta, jakość druku, czcionki, kod kreskowy i numer serii.'],
  ['Materiał i waga', 'Tańszy, „plastikowy" materiał lub nietypowa waga bywają sygnałem kopii.'],
  ['Zdjęcia', 'Uważaj, gdy sprzedawca używa tylko zdjęć stockowych — poproś o foto realnego egzemplarza.'],
  ['Weryfikacja', 'Porównaj z kartą produktu producenta lub wpisem na MyFigureCollection.'],
];

export default function Faq() {
  const navigate = useNavigate();

  return (
    <div className="dossier-container animate-fade-in" style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem' }}>
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Wróć do bazy
      </button>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-highlight)' }}>
        <HelpCircle size={28} /> FAQ i poradnik kolekcjonera
      </h1>
      <p style={{ opacity: 0.8, lineHeight: 1.7 }}>
        Najczęstsze pytania o FigureFame oraz praktyczny poradnik, jak nie dać się nabrać na podróbkę.
      </p>

      {/* FAQ akordeon */}
      <h2 style={{ marginTop: '2.5rem', color: 'var(--color-text-highlight)' }}>Najczęstsze pytania</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
        {FAQ.map(({ q, a }) => (
          <details key={q} style={{ background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '0 1.25rem' }}>
            <summary style={{ cursor: 'pointer', padding: '1rem 0', fontWeight: 650, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              {q}
              <ChevronDown size={18} style={{ flexShrink: 0, opacity: 0.6 }} />
            </summary>
            <p style={{ margin: '0 0 1rem', opacity: 0.85, lineHeight: 1.6 }}>{a}</p>
          </details>
        ))}
      </div>

      {/* Poradnik bootleg */}
      <h2 style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-highlight)' }}>
        <ShieldAlert size={24} /> Jak rozpoznać oryginał od podróbki
      </h2>
      <p style={{ opacity: 0.8, lineHeight: 1.7 }}>
        Siedem rzeczy, które warto sprawdzić przed zakupem na rynku wtórnym:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
        {BOOTLEG_CHECKLIST.map(([title, desc], i) => (
          <div key={title} style={{ display: 'flex', gap: '14px', background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-text-highlight)', color: 'var(--color-bg-shelf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>{i + 1}</div>
            <div>
              <strong>{title}</strong>
              <p style={{ margin: '2px 0 0', opacity: 0.82, lineHeight: 1.5, fontSize: '0.95rem' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', background: 'rgba(128,128,128,0.08)', border: '1px solid var(--color-glass-border)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.6 }}>
        <strong>Wskazówka:</strong> na karcie każdej figurki znajdziesz <em>Bootleg Radar</em> oraz przycisk
        „Poproś AI o cechy oryginału" — dostaniesz listę dopasowaną do konkretnej figurki.
      </div>

      <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '2.5rem', fontSize: '0.85rem' }}>
        Masz pytanie, którego tu nie ma? Skorzystaj z asystenta AI przy dowolnej figurce.
      </p>
    </div>
  );
}
