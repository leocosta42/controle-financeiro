const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inelqrzsnxiwhbjwfmko.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI');

async function go() {
  const {data} = await supabase.from('credit_cards').select('id, name');
  console.log(JSON.stringify(data));
}
go();
