async function fixDates() {
  console.log('🔄 Fazendo request direto via REST API...');
  
  const url = 'https://inelqrzsnxiwhbjwfmko.supabase.co/rest/v1/transactions?type=eq.credit&date=eq.2026-04-05';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // PATCH request para atualizar as transações em lote
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ date: '2026-03-15' })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Erro na atualização:', errorText);
    return;
  }

  const updated = await res.json();
  console.log(`✅ Sucesso! ${updated.length} transações atualizadas para 15/03/2026.`);
}

fixDates();
