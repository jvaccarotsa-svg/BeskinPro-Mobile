
const SUPABASE_URL = 'https://lckwxhtdjrmzhffulwse.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_';

const migrationSQL = `
-- BeSkinPro Mobile: Add missing photo URL columns to skin_analyses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'skin_analyses' AND column_name = 'standard_photo_url') THEN
        ALTER TABLE public.skin_analyses ADD COLUMN standard_photo_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'skin_analyses' AND column_name = 'uv_photo_url') THEN
        ALTER TABLE public.skin_analyses ADD COLUMN uv_photo_url TEXT;
    END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'skin_analyses' AND column_name IN ('standard_photo_url', 'uv_photo_url');
`;

async function applyMigration() {
    console.log('--- Applying Database Migration ---');
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql: migrationSQL }),
        });

        const body = await res.text();
        if (res.ok) {
            console.log('✅ Migration applied successfully!');
            console.log('Server response:', body);
        } else {
            console.error(`❌ Migration failed (status ${res.status}):`, body);
        }
    } catch (e) {
        console.error('❌ Network error during migration:', e.message);
    }
}

applyMigration();
