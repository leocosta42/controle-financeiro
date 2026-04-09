const { createClient } = require('@supabase/supabase-client');

const supabase = createClient('https://inelqrzsnxiwhbjwfmko.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI');

async function fixDates() {
  console.log('🔄 Buscando transações de crédito com data 05/04/2026...');
  
  // Apenas as de crédito que foram vinculadas no dia do vencimento 
  const { data: txs, error: fetchError } = await supabase
    .from('transactions')
    .select('id, date, type, description')
    .eq('type', 'credit')
    .eq('date', '2026-04-05');

  if (fetchError) {
    console.error('Erro na busca:', fetchError);
    return;
  }

  if (!txs || txs.length === 0) {
    console.log('Nenhuma transação do dia 05/04 encontrada. Verifique se a data no BD é exatamente essa.');
    return;
  }

  console.log(`Encontradas ${txs.length} transações para corrigir. Iniciando update para 15/03/2026...`);

  // Supabase update em lote
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ date: '2026-03-15' })
    .eq('type', 'credit')
    .eq('date', '2026-04-05');

  if (updateError) {
    console.error('Erro ao atualizar:', updateError);
  } else {
    console.log('✅ Correção aplicada com sucesso! Todas movidas para março.');
  }
}

fixDates();
