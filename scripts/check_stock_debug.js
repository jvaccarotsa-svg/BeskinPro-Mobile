
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const supabaseKey = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    console.log('Fetching products from pharmacy_products...');
    const { data, error } = await supabase.from('pharmacy_products').select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No products found in pharmacy_products table.');
        return;
    }

    console.log(`Found ${data.length} products.\n`);

    const categories = {};
    data.forEach(p => {
        const cat = p.category;
        if (!categories[cat]) categories[cat] = 0;
        if (Number(p.quantity) > 0) {
            categories[cat]++;
        }
    });

    console.log('Products with stock (>0) by category:');
    console.table(categories);

    console.log('\nDetailed sample of products:');
    data.slice(0, 10).forEach(p => {
        console.log(`- ${p.name} | Cat: ${p.category} | Stock: ${p.quantity}`);
    });
}

checkStock();
