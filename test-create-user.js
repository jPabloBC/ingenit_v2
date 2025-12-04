const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://juupotamdjqzpxuqdtco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dXBvdGFtZGpxenB4dXFkdGNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcwMjIxOCwiZXhwIjoyMDY1Mjc4MjE4fQ.qYlMzen6T8lSdaxhlngGlwrEoPMdSZp7StrGqEJ25Qo'
);

async function testCreateUser() {
  console.log('Intentando crear usuario de prueba...');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {}
  });

  if (error) {
    console.error('Error:', error);
    console.error('Error completo:', JSON.stringify(error, null, 2));
  } else {
    console.log('Usuario creado exitosamente:', data.user);
  }
}

testCreateUser();
