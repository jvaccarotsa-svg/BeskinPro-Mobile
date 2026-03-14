/**
 * Baumann Classification Engine (Mobile)
 * Same logic as desktop — runs fully client-side
 */

import criteria from './baumannCriterios.json';

export const baumannDescriptions = {
    'O': 'Grasa',
    'D': 'Seca',
    'S': 'Sensible',
    'R': 'Resistente',
    'P': 'Pigmentada',
    'N': 'No Pigmentada',
    'W': 'Envejecida',
    'T': 'Firme'
};

export const baumannFullDescriptions = {
    'O': 'Piel con tendencia grasa, poros visibles y brillo en zona T',
    'D': 'Piel seca con sensación de tirantez y posible descamación',
    'S': 'Piel sensible con tendencia a rojeces, picor o reacciones cosméticas',
    'R': 'Piel resistente que tolera bien los cosméticos y cambios ambientales',
    'P': 'Piel con manchas, melasma o hiperpigmentación postinflamatoria',
    'N': 'Piel homogénea sin alteraciones pigmentarias significativas',
    'W': 'Piel con signos de envejecimiento: arrugas, flacidez o fotodaño',
    'T': 'Piel firme y joven, sin signos avanzados de envejecimiento'
};

export function calculateBaumannType(data) {
    const result = {
        code: '',
        scores: {},
        explanations: {},
        details: {},
        raw_data: data
    };

    const axes = criteria.baumann_classification.axes;

    for (const [axisKey, axisConfig] of Object.entries(axes)) {
        let axisScore = 0;
        const axisDetails = [];

        axisConfig.features.forEach(feature => {
            let value = data[feature.name];

            if (value !== undefined) {
                let scoreContribution = 0;

                if (typeof value === 'boolean') {
                    scoreContribution = value ? feature.weight : 0;
                } else if (typeof value === 'number') {
                    if (value > 1 && value <= 10) {
                        scoreContribution = (value / 5) * feature.weight;
                    } else if (value >= -10 && value <= 10) {
                        scoreContribution = (value / 5) * feature.weight;
                    } else {
                        scoreContribution = value * feature.weight;
                    }
                }

                axisScore += scoreContribution;
                axisDetails.push({
                    feature: feature.name,
                    label: feature.name.replace(/_/g, ' '),
                    contribution: scoreContribution.toFixed(2),
                    weight: feature.weight,
                    val: value
                });
            }
        });

        const labelIndex = axisScore >= axisConfig.threshold ? '1' : '0';
        const label = axisConfig.labels[labelIndex];

        result.code += label;
        result.scores[axisKey] = axisScore.toFixed(2);
        result.details[axisKey] = axisDetails;
        result.explanations[axisKey] = `${axisConfig.description}: ${baumannDescriptions[label]}`;
    }

    return result;
}
