const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inelqrzsnxiwhbjwfmko.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI');

const dataRaw = `
24/02    PG PARCELA AUTOMAT 14/14    15,98        
05/03    JIM COM LEONA PARC 01/07    50,23        
09/03    MERCADOLIVRE  PARC 01/08    18,10        
09/01    IG EDEBE      PARC 03/11    98,00        
11/03    OFICINA LECAR PARC 01/10    132,72        
27/01    JIM COM LEONA PARC 03/10    182,14 
03/07    TS COMERCIO D PARC 09/10    144,60        
07/08    GRUPO CASAS B PARC 08/10    199,00        
09/09    LEONARDO TI   PARC 07/10    50,00        
09/12    EC *FARMAPIRA PARC 04/04    14,95        
19/12    MLP*KaBuM KaB PARC 04/04    26,25        
28/09    LEONARDO TI   PARC 07/11    193,63
28/01    CP            PARC 03/04    8,40                   
06/02    OTICA CRISLEN PARC 02/04    38,00                   
08/02    AlayaExpedico PARC 02/03    107,50         
21/08    LIVELO S.A.   PARC 08/12    23,62                         
27/03    PIX -   POLO PAGAMENTOS     23,00        
07/03    NAIANE LOREANO DA S         4,00        
14/03    XPan                        9,00        
17/03    LISTO*NOVA IMAGEM           12,50        
19/03    TENDA ATACADO SA            26,94        
19/03    AUTOZONE BRASIL COM AU      26,98        
19/03    COOP                        21,66        
21/03    MP*DAMISBAR                 12,00        
20/03    Ibis Santo Andre            365,72                                      
07/03    FrutaGurtFrozen             38,00 
`.trim();

async function run() {
  const { data: cards } = await supabase.from('credit_cards').select('id, name');
  const card = cards.find(c => c.name.toLowerCase().includes('banco do brasil'));
  if (!card) { console.log('Cartão Banco do Brasil não encontrado!'); return; }

  // We need session to get user_id from token if they didn't share it?
  // But wait, I'll just find the only user or use the cards' user_id!
  const { data: cardDetails } = await supabase.from('credit_cards').select('user_id').eq('id', card.id).single();
  const userId = cardDetails.user_id;

  const lines = dataRaw.split('\n');
  const items = lines.map(line => {
    const parts = line.split('    ').filter(x => x.trim().length > 0);
    const dateStr = parts[0].trim();
    const desc = parts[1].trim();
    const value = parseFloat(parts[2].trim().replace(',', '.'));
    
    const [day, month] = dateStr.split('/').map(Number);
    const year = month <= 3 ? 2026 : 2025;
    const isoDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    
    return {
      description: desc,
      amount: value,
      date: isoDate,
      type: 'credit',
      category: 'Cartão de Crédito',
      credit_card_id: card.id,
      user_id: userId,
      created_at: new Date().toISOString()
    };
  });

  const { error } = await supabase.from('transactions').insert(items);
  if (error) console.log('Erro:', error);
  else console.log('Sucesso! ' + items.length + ' lançamentos importados.');
}

run();
