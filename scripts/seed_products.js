const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manual env parsing
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }
        env[match[1].trim()] = value;
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const demoProducts = [
    // Limpiadores
    { name: 'Gel Limpiador Purificante', category: 'limpiador', description: 'Elimina el exceso de grasa y limpia los poros profundamente.', active_ingredients: 'Ácido Salicílico, Zinc PCA', quantity: 15, price: 18.50 },
    { name: 'Leche Limpiadora Calmante', category: 'limpiador', description: 'Limpiador suave para pieles secas y sensibles.', active_ingredients: 'Vitamina E, Bisabolol', quantity: 8, price: 16.90 },
    { name: 'Espuma Micelar Suave', category: 'limpiador', description: 'Limpieza efectiva para todo tipo de pieles, especialmente sensibles.', active_ingredients: 'Agua Termal, Glicerina', quantity: 12, price: 14.50 },

    // Serums
    { name: 'Sérum Niacinamida 10%', category: 'serum', description: 'Regula la producción de sebo y minimiza poros.', active_ingredients: 'Niacinamida, Ácido Hialurónico', quantity: 5, price: 32.00 },
    { name: 'Sérum Retinol Renovador', category: 'serum', description: 'Tratamiento intensivo anti-edad y rejuvenecedor.', active_ingredients: 'Retinol Puro, Péptidos', quantity: 3, price: 45.00 },
    { name: 'Sérum Vitamina C Iluminador', category: 'serum', description: 'Potente antioxidante que unifica el tono y aporta luz.', active_ingredients: 'Vitamina C Estabilizada, Ácido Ferúlico', quantity: 0, price: 38.00 },

    // Hidratantes
    { name: 'Crema Hidratante Ligera Matificante', category: 'hidratante', description: 'Hidratación libre de aceites para pieles grasas.', active_ingredients: 'Ácido Hialurónico, Silicio', quantity: 20, price: 24.50 },
    { name: 'Bálsamo Nutritivo Intensivo', category: 'hidratante', description: 'Reparación profunda para pieles muy secas.', active_ingredients: 'Manteca de Karité, Ceramidas', quantity: 7, price: 28.90 },
    { name: 'Crema Calmante Antirojeces', category: 'hidratante', description: 'Alivia la irritación y reduce visiblemente las rojeces.', active_ingredients: 'Niacinamida, Extracto de Regaliz', quantity: 4, price: 26.00 },

    // Protección Solar
    { name: 'Fluido Solar Invisible SPF 50+', category: 'proteccion_solar', description: 'Protección alta con acabado seco al tacto.', active_ingredients: 'Filtros UVA/UVB, Vitamina E', quantity: 25, price: 21.00 },
    { name: 'Crema Solar Hidratante SPF 50+', category: 'proteccion_solar', description: 'Protección solar complementaria para pieles secas.', active_ingredients: 'Ácido Hialurónico, Antiox', quantity: 10, price: 22.50 },
];

async function seed() {
    console.log('🌱 Iniciando carga de productos de prueba...');

    // Primero limpiamos la tabla (opcional, pero ayuda a evitar duplicados en pruebas)
    const { error: deleteError } = await supabase.from('pharmacy_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) console.warn('Aviso: No se pudo limpiar la tabla, continuando...', deleteError.message);

    const { data, error } = await supabase.from('pharmacy_products').insert(demoProducts).select();

    if (error) {
        console.error('❌ Error al insertar productos:', error);
    } else {
        console.log(`✅ ¡Éxito! Se han insertado ${data.length} productos.`);
    }
}

seed();
