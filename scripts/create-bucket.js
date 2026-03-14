// Create skin-photos bucket on startup via a simple API call
// Run this once from browser console or via a script

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://lckwxhtdjrmzhffulwse.supabase.co',
    'sb_secret_EYfqaW5QW0LpC-wI8G2t-mD7-S7oBq6l_W3UoX5_'
);

async function createBucket() {
    const { data, error } = await supabase.storage.createBucket('skin-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (error && error.message !== 'The resource already exists') {
        console.error('Error creating bucket:', error.message);
    } else {
        console.log('✅ skin-photos bucket ready');
    }
}

createBucket();
