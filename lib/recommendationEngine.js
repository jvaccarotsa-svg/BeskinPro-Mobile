/**
 * Recommendation Engine (Mobile)
 * Same logic as desktop — matches Baumann type with pharmacy stock
 */

export function generateRoutine(baumannType, stock, sensoryPreferences = {}) {
    const routine = {
        steps: { morning: [], night: [] },
        recommendations: [],
        debug: []
    };

    const safeType = baumannType || '';
    const isOily = safeType.includes('O');
    const isDry = safeType.includes('D');
    const isSensitive = safeType.includes('S');
    const isPigmented = safeType.includes('P');
    const isAging = safeType.includes('W');

    const calculateSkinScore = (product) => {
        let score = 0;
        const text = ((product.name || '') + ' ' + (product.description || '') + ' ' + (product.active_ingredients || '')).toLowerCase();

        if (isOily) {
            if (product.category === 'limpiador' && (text.includes('gel') || text.includes('espuma') || text.includes('purifi'))) score += 5;
            if (text.includes('salicílico') || text.includes('niacinamida') || text.includes('matificante')) score += 3;
            if (text.includes('aceite') || text.includes('nutritiva')) score -= 2;
        } else if (isDry) {
            if (product.category === 'limpiador' && (text.includes('leche') || text.includes('aceite') || text.includes('crema'))) score += 5;
            if (text.includes('hialurónico') || text.includes('ceramidas') || text.includes('karité')) score += 3;
        }
        if (isSensitive) {
            if (text.includes('calmante') || text.includes('rojeces') || text.includes('tolerancia')) score += 5;
            if (text.includes('alcohol') || text.includes('glicólico')) score -= 5;
        }
        if (isPigmented) {
            if (text.includes('vitamina c') || text.includes('arbutina') || text.includes('kójico') || text.includes('tranexámico')) score += 5;
        }
        if (isAging) {
            if (text.includes('retinol') || text.includes('péptidos') || text.includes('colágeno') || text.includes('anti-edad')) score += 5;
        }
        return score;
    };

    const findBest = (category) => {
        const candidates = stock
            .filter(p => p.category === category)
            .filter(p => Number(p.quantity) > 0) // STRICT STOCK FILTER
            .map(p => ({ product: p, score: calculateSkinScore(p) }))
            .sort((a, b) => b.score - a.score);
        return candidates[0]?.product || null;
    };

    const cleanser = findBest('limpiador');
    if (cleanser) {
        routine.steps.morning.push({ action: 'Limpieza', product: cleanser });
        routine.steps.night.push({ action: 'Limpieza', product: cleanser });
    }

    const amSerum = findBest('serum');
    if (amSerum) {
        routine.steps.morning.push({ action: 'Tratamiento', product: amSerum });
        routine.steps.night.push({ action: 'Tratamiento Renovador', product: amSerum });
    }

    const solar = findBest('proteccion_solar');
    if (solar) routine.steps.morning.push({ action: 'Protección Solar', product: solar });

    const moist = findBest('hidratante');
    if (moist) {
        routine.steps.night.push({ action: 'Hidratación', product: moist });
        if (isDry) routine.steps.morning.push({ action: 'Hidratación', product: moist });
    }

    // Calculate stock status summary
    const checkStock = (steps) => {
        const total = steps.length;
        const available = steps.filter(s => s.product.quantity > 0).length;
        return { isComplete: available === total && total > 0, available, total };
    };

    routine.stockStatus = {
        morning: checkStock(routine.steps.morning),
        night: checkStock(routine.steps.night)
    };

    return routine;
}

export function getStockStatus(quantity) {
    const q = Number(quantity);
    if (q === 0 || isNaN(q)) return { label: 'Agotado', color: '#e05252', emoji: '❌' };
    if (q <= 3) return { label: 'Pocas unidades', color: '#f0a500', emoji: '⚠️' };
    return { label: 'Disponible', color: '#4caf88', emoji: '✅' };
}
