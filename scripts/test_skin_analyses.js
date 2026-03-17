
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabaseUrl = 'https://lckwxhtdjrmzhffulwse.supabase.co';
    const supabaseKey = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Testing skin_analyses columns ---');
    const { data, error } = await supabase.from('skin_analyses').select('id, standard_photo_url, uv_photo_url').limit(1);

    if (error) {
        console.error('Error:', error.message);
        console.error('Full Error:', JSON.stringify(error));
    } else {
        console.log('Success! Data:', data);
        if (data && data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        }
    }
}

test();
