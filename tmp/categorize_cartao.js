const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://inelqrzsnxiwhbjwfmko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function autoCategorize() {
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'credit');

  if (error) {
    console.error("Erro ao buscar:", error);
    return;
  }

  let count = 0;
  for (const t of txs) {
    const desc = t.description.toLowerCase();
    let newCat = '';

    if (desc.includes('ibis') || desc.includes('hotel') || desc.includes('pousada')) newCat = 'Lazer / Viagens';
    else if (desc.includes('presente')) newCat = 'Presentes';
    else if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('assai') || desc.includes('carrefour')) newCat = 'Mercado';
    else if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('mcdonald')) newCat = 'Alimentação';
    else if (desc.includes('uber') || desc.includes('99') || desc.includes('posto')) newCat = 'Transporte';
    else if (desc.includes('farmacia') || desc.includes('droga')) newCat = 'Saúde';
    else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('amazon')) newCat = 'Assinaturas / Streaming';
    else if (desc.includes('pet') || desc.includes('cobasi') || desc.includes('racao')) newCat = 'Pet';
    else if (desc.includes('curso') || desc.includes('escola') || desc.includes('faculdade')) newCat = 'Educação';
    
    // Fallbacks baseados na imagem e uso provável:
    if (!newCat && desc.includes('iphone')) newCat = 'Outros';

    if (newCat) {
      const { error: updErr } = await supabase
        .from('transactions')
        .update({ category: newCat })
        .eq('id', t.id);
        
      if (!updErr) {
        console.log(`✓ Mapeado: "${t.description}" -> ${newCat}`);
        count++;
      }
    }
  }

  console.log(`\nFinalizado! ${count} transações categorizadas automaticamente.`);
}

autoCategorize();
