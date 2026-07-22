const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function testInsert() {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      full_name: 'Test Contributor',
      phone_number: '',
      role: 'contributor',
      status: 'active',
      telegram_id: 123456789,
      telegram_username: 'testuser',
      telegram_verified: true,
      telegram_linked_at: new Date().toISOString(),
      telegram_last_seen: new Date().toISOString(),
    })
    .select('id, role, email')
    .single();

  console.log('Data:', data);
  console.log('Error:', error);
}

testInsert();
