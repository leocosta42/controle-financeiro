const { createClient } = require('@supabase/supabase-client');
const supabase = createClient('https://inelqrzsnxiwhbjwfmko.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWxxcnpzbnhpd2hiandmbWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzAyNDUsImV4cCI6MjA5MDEwNjI0NX0.NXnTvL7o24L3zz76cC8cZEOTvxGDZpNHXq6i79ka8pI');

async function run() {
  const { data, error } = await supabase.from('transactions').select('type').limit(200);
  if (error) {
    console.error(error);
    return;
  }
  const types = [...new Set(data.map(d => d.type))];
  console.log('TRANS_TYPES:', JSON.stringify(types));
}
run();
