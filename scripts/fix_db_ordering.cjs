const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Zidentyfikuj 3 "Base" figurki na podstawie nazw
  const baseNames = ['Hatsune Miku Base', 'Super Sonico Base', 'Miyuki Sone Base'];

  const { data: allFigures, error: fetchError } = await supabase
    .from('figures')
    .select('id, name');

  if (fetchError) {
    console.error("Błąd pobierania:", fetchError);
    return;
  }

  for (const fig of allFigures) {
    if (baseNames.includes(fig.name)) {
      // Ustaw jako APPROVED i zrób im bardzo stary created_at, żeby zawsze były na początku przy ascending: true
      await supabase.from('figures').update({ 
        status: 'APPROVED',
        created_at: '2020-01-01T00:00:00Z' 
      }).eq('id', fig.id);
      console.log(`✅ ${fig.name} ustawiono jako APPROVED (i przeniesiono na początek)`);
    } else {
      // Wszystkie inne ustawiamy na PENDING
      await supabase.from('figures').update({ 
        status: 'PENDING'
      }).eq('id', fig.id);
      console.log(`⏳ ${fig.name} wyrzucono do PENDING`);
    }
  }

  console.log("Gotowe!");
}

main();
