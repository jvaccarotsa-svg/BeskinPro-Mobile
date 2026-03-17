const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const SERVICE_KEY = 'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkConstraint() {
    const { data, error } = await adminClient.rpc('exec_sql', {
        sql: "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'patients_sex_check';"
    });
    console.log(error || data);
}

checkConstraint();
