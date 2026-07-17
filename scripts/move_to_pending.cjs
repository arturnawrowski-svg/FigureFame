const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Pobierz wszystkie figurki posortowane po dacie utworzenia lub id
  const { data: figures, error: fetchError } = await supabase
    .from('figures')
    .select('id, name')
    .order('id', { ascending: true });

  if (fetchError) {
    console.error("Błąd pobierania:", fetchError);
    return;
  }

  // Zostawiamy 3 pierwsze, reszta leci do PENDING
  const idsToPending = figures.slice(3).map(f => f.id);

  if (idsToPending.length === 0) {
    console.log("Brak figurek do przeniesienia.");
    return;
  }

  console.log(`Przenoszenie ${idsToPending.length} figurek do PENDING...`);

  const { error: updateError } = await supabase
    .from('figures')
    .update({ status: 'PENDING' })
    .in('id', idsToPending);

  if (updateError) {
    console.error("Błąd aktualizacji:", updateError);
  } else {
    console.log("✅ Gotowe! Figurki przeniesione do PENDING.");
  }
}

main();
