const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const ANON_KEY = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkExistingSex() {
    const { data, error } = await supabase.from('patients').select('sex').not('sex', 'is', null).limit(10);
    console.log(error || data);
}

checkExistingSex();
