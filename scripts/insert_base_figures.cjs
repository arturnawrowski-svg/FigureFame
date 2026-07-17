const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const baseFigures = [
  {
    name: 'Hatsune Miku Base',
    japanese_name: '初音ミク',
    series: 'Vocaloid',
    manufacturer: 'Good Smile Company',
    scale: '1/7',
    original_price: '15 000 JPY',
    official_image_url: 'miku_figure', // It's mapped locally by Showcase.jsx adding /images/official/
    status: 'APPROVED',
    submitted_by: null,
    light_class: 'light-miku',
    additional_info: [
      'Figurka w wersji klasycznej, wyrzeźbiona z niezwykłą dbałością o detale.',
      'Jej słynne, turkusowe kucyki (twintails) zostały odtworzone z wykorzystaniem przezroczystych elementów PVC.'
    ],
    market_value: {
      average: 'około 15 000 JPY (ok. 400 zł) za egzemplarz w bardzo dobrym stanie.',
      community: [
        'okazje zdarzają się od 300 USD',
        'typowe oferty mieszczą się w okolicach 400 USD'
      ]
    },
    where_to_search: [
      'Solaris Japan',
      'Mandarake',
      'Yahoo! Auctions Japan'
    ]
  },
  {
    name: 'Super Sonico Base',
    japanese_name: 'すーぱーそに子',
    series: 'Nitroplus',
    manufacturer: 'Alter',
    scale: '1/7',
    original_price: '18 500 JPY',
    official_image_url: 'sonico_figure',
    status: 'APPROVED',
    submitted_by: null,
    light_class: 'light-sonico',
    additional_info: [
      'Zjawiskowa figurka wirtualnej idolki w letnim stroju z zarzuconą kurtką.',
      'Gra cieni na skórze postaci jest po prostu zdumiewająca. Skala 1/7 pozwala na imponującą prezencję na półce.'
    ],
    market_value: {
      average: 'około 20 000 JPY (ok. 530 zł) za egzemplarz w bardzo dobrym stanie.',
      community: [
        'okazje zdarzają się od 150 USD',
        'typowe oferty mieszczą się w okolicach 200-250 USD'
      ]
    },
    where_to_search: [
      'Solaris Japan',
      'AmiAmi Pre-owned',
      'Mandarake'
    ]
  },
  {
    name: 'Miyuki Sone Base',
    japanese_name: '曾根 美雪',
    series: 'Kimi to Kanojo to Kanojo no Koi',
    manufacturer: 'Griffon Enterprises',
    scale: '1/8',
    original_price: '7 250 JPY',
    official_image_url: 'miyuki_figure',
    status: 'APPROVED',
    submitted_by: null,
    light_class: 'light-sonico',
    additional_info: [
      'Jest to figurka pochodząca z japońskiej gry visual novel dla dorosłych (18+), choć sama figurka nie przedstawia żadnych treści erotycznych.'
    ],
    market_value: {
      average: 'około 170 000 JPY (ok. 4300–4500 zł) za egzemplarz w bardzo dobrym stanie, choć ceny mocno się wahają.',
      community: [
        'okazje zdarzają się od 400–600 USD'
      ]
    },
    where_to_search: [
      'Solaris Japan – obecnie wyprzedana, ale warto obserwować.',
      'Yahoo! Auctions Japan'
    ]
  }
];

async function insertBaseFigures() {
  console.log("Dodawanie bazowych figurek...");
  
  for (const fig of baseFigures) {
    const { data, error } = await supabase.from('figures').insert(fig);
    if (error) {
      console.error("Błąd zapisu:", error);
    } else {
      console.log("Zapisano:", fig.name);
    }
  }
  console.log("Gotowe!");
}

insertBaseFigures();
