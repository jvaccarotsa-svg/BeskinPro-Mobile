/**
 * full_access_test.js
 * Tests INSERT access on ALL tables the mobile app writes to.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const ANON_KEY = 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ';
const SERVICE_KEY = 'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_';

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function testTable(tableName, insertPayload) {
    console.log(`\n─── ${tableName.toUpperCase()} ───`);

    // SELECT
    const { data: sel, error: selErr } = await anonClient.from(tableName).select('*').limit(1);
    if (selErr) {
        console.log(`  SELECT: ❌ ${selErr.message} (code: ${selErr.code})`);
    } else {
        console.log(`  SELECT: ✅ OK (${sel?.length} rows)`);
    }

    // INSERT
    const { data: ins, error: insErr } = await anonClient.from(tableName).insert([insertPayload]).select().single();
    if (insErr) {
        console.log(`  INSERT: ❌ ${insErr.message} (code: ${insErr.code})`);
    } else {
        console.log(`  INSERT: ✅ OK (id=${ins?.id})`);
        // Clean up
        if (ins?.id) {
            const { error: delErr } = await adminClient.from(tableName).delete().eq('id', ins.id);
            if (!delErr) console.log(`  CLEANUP: ✅ deleted`);
        }
    }
}

async function listAllTables() {
    console.log('\n=== Listing all public tables ===');
    // Use service role to query pg_tables
    const { data, error } = await adminClient.rpc('exec_sql', {
        sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    });
    if (error) {
        console.log('Could not list tables via RPC. Trying information_schema...');
        const { data: d2, error: e2 } = await adminClient
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
        if (e2) console.log('Also failed:', e2.message);
        else console.log('Tables:', d2?.map(r => r.table_name));
    } else {
        console.log('Tables:', data);
    }
}

async function main() {
    console.log('BeSkinPro Mobile — Full Access Test');
    console.log('Using ANON key for all INSERT/SELECT tests');
    console.log('='.repeat(50));

    // First list all tables
    await listAllTables();

    // Test patients
    await testTable('patients', {
        first_name: '__test',
        last_name: '__mobile_test',
        created_at: new Date().toISOString(),
    });

    // Test baumann_responses — check what columns exist first
    const { data: bauCols, error: bauErr } = await adminClient
        .from('baumann_responses')
        .select('*')
        .limit(1);
    console.log('\n--- baumann_responses columns check ---');
    if (bauErr) console.log('Error accessing table:', bauErr.message, '(code:', bauErr.code, ')');
    else console.log('Sample row keys:', bauCols?.[0] ? Object.keys(bauCols[0]) : 'table empty but accessible');

    await testTable('baumann_responses', {
        lifestyle: { test: true },
        created_at: new Date().toISOString(),
    });

    // Test skin_analyses
    const { data: skinCols, error: skinErr } = await adminClient
        .from('skin_analyses')
        .select('*')
        .limit(1);
    console.log('\n--- skin_analyses columns check ---');
    if (skinErr) console.log('Error accessing table:', skinErr.message, '(code:', skinErr.code, ')');
    else console.log('Sample row keys:', skinCols?.[0] ? Object.keys(skinCols[0]) : 'table empty but accessible');

    await testTable('skin_analyses', {
        baumann_code: 'DRNT',
        source: '__test',
        analyzed_at: new Date().toISOString(),
    });

    // Test pharmacy_products
    const { data: pharCols, error: pharErr } = await adminClient
        .from('pharmacy_products')
        .select('*')
        .limit(1);
    console.log('\n--- pharmacy_products sample ---');
    if (pharErr) console.log('Error:', pharErr.message);
    else console.log('Sample row keys:', pharCols?.[0] ? Object.keys(pharCols[0]) : 'empty');

    console.log('\n' + '='.repeat(50));
    console.log('Done. Check above for any ❌ errors.');
}

main().catch(console.error);
