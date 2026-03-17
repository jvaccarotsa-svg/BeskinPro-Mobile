/**
 * apply_rls_via_api.js
 * Applies RLS policies using Supabase Management API (requires personal access token)
 * OR using the pg REST endpoint with service role
 */

const https = require('https');

const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_';
const PROJECT_REF = 'lckwxhtdjrmzhffulwse';

const SQL = `
-- BeSkinPro Mobile: Allow anon full CRUD on all app tables

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_patients" ON public.patients;
DROP POLICY IF EXISTS "anon_insert_patients" ON public.patients;
DROP POLICY IF EXISTS "anon_update_patients" ON public.patients;
DROP POLICY IF EXISTS "anon_delete_patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anon select on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anon insert on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anon update on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anon delete on patients" ON public.patients;
CREATE POLICY "anon_select_patients" ON public.patients FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_patients" ON public.patients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_patients" ON public.patients FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_patients" ON public.patients FOR DELETE TO anon USING (true);

ALTER TABLE public.baumann_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_baumann_responses" ON public.baumann_responses;
DROP POLICY IF EXISTS "anon_insert_baumann_responses" ON public.baumann_responses;
DROP POLICY IF EXISTS "anon_update_baumann_responses" ON public.baumann_responses;
DROP POLICY IF EXISTS "anon_delete_baumann_responses" ON public.baumann_responses;
CREATE POLICY "anon_select_baumann_responses" ON public.baumann_responses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_baumann_responses" ON public.baumann_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_baumann_responses" ON public.baumann_responses FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_baumann_responses" ON public.baumann_responses FOR DELETE TO anon USING (true);

ALTER TABLE public.skin_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_skin_analyses" ON public.skin_analyses;
DROP POLICY IF EXISTS "anon_insert_skin_analyses" ON public.skin_analyses;
DROP POLICY IF EXISTS "anon_update_skin_analyses" ON public.skin_analyses;
DROP POLICY IF EXISTS "anon_delete_skin_analyses" ON public.skin_analyses;
CREATE POLICY "anon_select_skin_analyses" ON public.skin_analyses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_skin_analyses" ON public.skin_analyses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_skin_analyses" ON public.skin_analyses FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_skin_analyses" ON public.skin_analyses FOR DELETE TO anon USING (true);

ALTER TABLE public.pharmacy_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "anon_insert_pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "anon_update_pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "anon_delete_pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "Allow anon select on pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "Allow anon insert on pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "Allow anon update on pharmacy_products" ON public.pharmacy_products;
DROP POLICY IF EXISTS "Allow anon delete on pharmacy_products" ON public.pharmacy_products;
CREATE POLICY "anon_select_pharmacy_products" ON public.pharmacy_products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_pharmacy_products" ON public.pharmacy_products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_pharmacy_products" ON public.pharmacy_products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_pharmacy_products" ON public.pharmacy_products FOR DELETE TO anon USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommendations') THEN
    ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon_select_recommendations" ON public.recommendations;
    DROP POLICY IF EXISTS "anon_insert_recommendations" ON public.recommendations;
    DROP POLICY IF EXISTS "anon_update_recommendations" ON public.recommendations;
    DROP POLICY IF EXISTS "anon_delete_recommendations" ON public.recommendations;
    CREATE POLICY "anon_select_recommendations" ON public.recommendations FOR SELECT TO anon USING (true);
    CREATE POLICY "anon_insert_recommendations" ON public.recommendations FOR INSERT TO anon WITH CHECK (true);
    CREATE POLICY "anon_update_recommendations" ON public.recommendations FOR UPDATE TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "anon_delete_recommendations" ON public.recommendations FOR DELETE TO anon USING (true);
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.baumann_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skin_analyses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_products TO anon;

SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('patients', 'baumann_responses', 'skin_analyses', 'pharmacy_products');
`;

async function applyViaManagementAPI() {
    // Supabase Management API v1 — requires a personal access token (PAT)
    // This is different from the service role key
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

    console.log('Attempting Supabase Management API...');
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Management API uses personal access token, not service role
            // If user has a PAT we'd use it here — trying service role as fallback
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: SQL }),
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text.slice(0, 500)}`);
    return res.ok;
}

async function applyViaPGREST() {
    // Try the pg REST sql endpoint
    const url = `${SUPABASE_URL}/rest/v1/`;

    // Try calling a stored function if one exists
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: SQL }),
    });
    const text = await res.text();
    console.log(`PGREST Status: ${res.status}`);
    console.log(`Response: ${text.slice(0, 200)}`);
    return res.ok;
}

async function testCurrentAccess() {
    console.log('\n=== Testing current anon access to patients table ===');
    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(SUPABASE_URL, 'sb_publishable_bTddBIeOGgz_HaqtBDfYzA_GZCeRRSQ');

    // Test SELECT
    const { data: selectData, error: selectError } = await anonClient.from('patients').select('id, first_name').limit(1);
    console.log('SELECT patients:', selectError ? `ERROR: ${selectError.message}` : `OK (${selectData?.length} rows)`);

    // Test INSERT with rollback-safe approach (we'll delete right away)
    const testName = `__test_${Date.now()}`;
    const { data: insertData, error: insertError } = await anonClient.from('patients').insert([{
        first_name: testName,
        last_name: 'TestDelete',
        created_at: new Date().toISOString(),
    }]).select().single();
    console.log('INSERT patients:', insertError ? `ERROR: ${insertError.message}` : `OK (id=${insertData?.id})`);

    if (insertData?.id) {
        // Clean up
        const { error: delError } = await anonClient.from('patients').delete().eq('id', insertData.id);
        console.log('DELETE (cleanup):', delError ? `ERROR: ${delError.message}` : 'OK');
    }

    return !insertError;
}

async function main() {
    // First test current access
    const alreadyWorks = await testCurrentAccess();

    if (alreadyWorks) {
        console.log('\n✅ anon INSERT on patients already works! RLS policies may already be correct.');
        console.log('   The error might be something else. Check the browser console for exact error message.');
        return;
    }

    console.log('\n❌ anon INSERT on patients is blocked — need to apply RLS policies.');

    const ok1 = await applyViaManagementAPI();
    if (!ok1) {
        await applyViaPGREST();
    }

    // Test again after applying
    console.log('\n=== Re-testing after policy application ===');
    await testCurrentAccess();
}

main().catch(console.error);
