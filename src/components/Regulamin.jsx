import UkladDokumentu from './UkladDokumentu';

// ============================================================================
// Regulamin — SZKIC do akceptacji.
//
// Trzy punkty niosą realne zobowiązania i muszą być zgodne z kodem:
//   • pkt 3 — wpis zostaje po usunięciu konta (api/delete-account.js)
//   • pkt 5 — podpis „Fot.", nie „©"        (src/lib/prawaDoZdjecia.js)
//   • pkt 6 — prowizja nie zmienia kolejności ofert (server-lib/affiliateLinks.js)
// Jeśli któreś z tych zachowań zmieni się w kodzie, ten tekst przestaje być prawdziwy.
// ============================================================================

const DATA = '31 lipca 2026';

const SPIS = [
  { id: 'r1', etykieta: '1. Czym jest FigureFame' },
  { id: 'r2', etykieta: '2. Konto' },
  { id: 'r3', etykieta: '3. Twoje wpisy' },
  { id: 'r4', etykieta: '4. Moderacja' },
  { id: 'r5', etykieta: '5. Zdjęcia i prawa' },
  { id: 'r6', etykieta: '6. Linki partnerskie' },
  { id: 'r7', etykieta: '7. Skąd dane i czego nie gwarantujemy' },
  { id: 'r8', etykieta: '8. Reklamacje i zmiany' },
];

export default function Regulamin({ wOknie = false }) {
  return (
    <UkladDokumentu tytul="Regulamin serwisu" data={DATA} spis={SPIS} wOknie={wOknie}>
      <div className="dokument-skrot">
        <span>W skrócie</span>
        <p>
          Serwis jest bezpłatny. Dodając figurkę, oddajesz ją do wspólnej bazy. Dane mają
          charakter informacyjny — przed zakupem za kilkaset złotych sprawdź je również gdzie indziej.
        </p>
      </div>

      <h2 id="r1">1. Czym jest FigureFame</h2>
      <p>
        FigureFame to bezpłatna baza wiedzy o japońskich figurkach kolekcjonerskich: dane
        katalogowe, ocena ryzyka podróbki, asystent AI i odnośniki do ofert. Serwis prowadzi
        administrator wskazany w polityce prywatności.
      </p>

      <h2 id="r2">2. Konto</h2>
      <p>
        Założenie konta jest dobrowolne i bezpłatne. Do dodawania figurek potrzebny jest
        potwierdzony adres e-mail. Konto zakłada się dla siebie, jedno na osobę. Z serwisu mogą
        korzystać osoby, które ukończyły <strong>16 lat</strong>.
      </p>

      <h2 id="r3">3. Twoje wpisy</h2>
      <p>
        Odpowiadasz za treści, które dodajesz, i oświadczasz, że masz prawo je udostępnić.
        Dodając wpis, udzielasz nam nieodpłatnej, niewyłącznej licencji na jego publikację w serwisie.
      </p>
      <p>
        <strong>
          Zatwierdzony wpis staje się częścią wspólnej bazy i zostaje w niej także wtedy, gdy
          usuniesz konto
        </strong>{' '}
        — traci wówczas powiązanie z Tobą, a opiekę nad nim przejmuje moderator. Piszemy to wprost,
        bo to jedyna rzecz w serwisie, której usunięcie konta nie cofa.
      </p>

      <h2 id="r4">4. Moderacja</h2>
      <p>
        Każdy wpis przechodzi weryfikację przed publikacją. Możemy poprawić, odrzucić lub usunąć
        wpis — w szczególności gdy zawiera nieprawdziwe dane, ma charakter reklamowy, narusza prawa
        osób trzecich albo dotyczy pozycji dla dorosłych, których serwis nie prowadzi.
      </p>

      <h2 id="r5">5. Zdjęcia i prawa</h2>
      <p>
        Zdjęcia figurek pochodzą od producentów i sklepów. Podpisujemy je formułą{' '}
        <strong>„Fot. [producent]"</strong> — wskazujemy autorstwo zdjęcia, a <strong>nie</strong>{' '}
        rozstrzygamy o prawach do postaci ani do samej figurki.
      </p>
      <p>
        Jeśli jesteś właścicielem praw do zdjęcia i nie chcesz, żeby znajdowało się w serwisie —
        napisz na adres kontaktowy. Usuwamy bez dyskusji i bez pytania o powód.
      </p>

      <h2 id="r6">6. Linki partnerskie</h2>
      <p>
        Część odnośników do sklepów to <strong>linki partnerskie</strong>. Jeśli kupisz przez taki
        link, sklep może wypłacić nam prowizję.{' '}
        <strong>Dla Ciebie cena pozostaje taka sama.</strong> Prowizja nie wpływa na kolejność ofert
        ani na ocenę figurki. Linki partnerskie oznaczamy w miejscu, w którym się pojawiają.
      </p>

      <h2 id="r7">7. Skąd dane i czego nie gwarantujemy</h2>
      <p>
        Dane pochodzą z katalogów kolekcjonerskich, sklepów oraz modeli AI. Mogą być niepełne
        lub nieaktualne. <strong>Asystent AI bywa w błędzie</strong> — jego odpowiedzi nie są
        ekspertyzą ani wyceną. Ocena ryzyka podróbki jest wskazówką, nie orzeczeniem
        o autentyczności egzemplarza.
      </p>
      <p>
        Serwis udostępniamy bezpłatnie, w stanie, w jakim jest. Nie odpowiadamy za decyzje zakupowe
        podjęte na podstawie prezentowanych informacji. Nie ogranicza to praw przysługujących
        konsumentom na podstawie bezwzględnie obowiązujących przepisów.
      </p>

      <h2 id="r8">8. Reklamacje i zmiany</h2>
      <p>
        Reklamacje i uwagi: <a href="mailto:figurefame@figurefame.com">figurefame@figurefame.com</a>.
        Odpowiadamy w ciągu 14 dni. O zmianach regulaminu uprzedzamy na stronie z siedmiodniowym
        wyprzedzeniem.
      </p>
    </UkladDokumentu>
  );
}
