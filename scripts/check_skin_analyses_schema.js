
const { createClient } = require('@supabase/supabase-js');

async function checkSchema() {
    const supabaseUrl = 'https://lckwxhtdjrmzhffulwse.supabase.co';
    const supabaseKey = 'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_'; // Service role key
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Checking skin_analyses table ---');

    // Attempt to select from the table to see what columns come back
    const { data, error } = await supabase.from('skin_analyses').select('*').limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found in first record:', Object.keys(data[0]));
    } else {
        console.log('Table is empty or no columns returned.');
        // Try to insert a dummy record with only basic info to see if it even works
        const { error: insertError } = await supabase.from('skin_analyses').insert([{
            patient_id: '00000000-0000-0000-0000-000000000000', // Non-existent patient probably
            baumann_code: 'TEST'
        }]);
        if (insertError) {
            console.error('Insert error (might be expected):', insertError.message);
        }
    }
}

checkSchema();
