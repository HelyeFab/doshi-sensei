/**
 * Utility to analyze kanji selection distribution for fairness
 */

export function analyzeKanjiDistribution(
  availableKanji: any[],
  numTrials: number = 10000,
  selectionSize: number = 5
): { [kanji: string]: number } {
  const frequency: { [kanji: string]: number } = {};
  
  // Initialize frequency map
  availableKanji.forEach(k => {
    frequency[k.character || k.kanji] = 0;
  });
  
  // Run simulations
  for (let trial = 0; trial < numTrials; trial++) {
    const tempAvailable = [...availableKanji];
    const selected = [];
    
    // Simulate the same selection algorithm used in KanjiQuest
    for (let i = 0; i < selectionSize && tempAvailable.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * tempAvailable.length);
      const selectedKanji = tempAvailable.splice(randomIndex, 1)[0];
      selected.push(selectedKanji);
      frequency[selectedKanji.character || selectedKanji.kanji]++;
    }
  }
  
  return frequency;
}

export function calculateDistributionStats(frequency: { [kanji: string]: number }) {
  const values = Object.values(frequency);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Find most and least frequent kanji
  const entries = Object.entries(frequency);
  entries.sort((a, b) => b[1] - a[1]);
  
  return {
    mean,
    stdDev,
    min,
    max,
    coefficient_of_variation: (stdDev / mean) * 100,
    most_frequent: entries.slice(0, 5).map(([k, v]) => ({ kanji: k, count: v })),
    least_frequent: entries.slice(-5).map(([k, v]) => ({ kanji: k, count: v })),
    expected_frequency: mean
  };
}

// Test function to verify fairness
export async function testKanjiSelectionFairness(jlptLevel: number) {
  const { getKanjiByJLPT } = await import('./kanjiUtils');

  try {
    const allKanji = await getKanjiByJLPT(jlptLevel);

    const frequency = analyzeKanjiDistribution(allKanji);
    const stats = calculateDistributionStats(frequency);

    console.log(`- Mean frequency: ${stats.mean.toFixed(2)}`);
    console.log(`- Standard deviation: ${stats.stdDev.toFixed(2)}`);
    console.log(`- Coefficient of variation: ${stats.coefficient_of_variation.toFixed(2)}%`);

    console.log(`- Expected uniform frequency: ${stats.expected_frequency.toFixed(2)}`);

    stats.most_frequent.forEach(({ kanji, count }) => {
      const deviation = ((count - stats.mean) / stats.mean * 100).toFixed(1);
      console.log(`  ${kanji}: ${count} times (${deviation}% from mean)`);
    });

    stats.least_frequent.forEach(({ kanji, count }) => {
      const deviation = ((count - stats.mean) / stats.mean * 100).toFixed(1);
      console.log(`  ${kanji}: ${count} times (${deviation}% from mean)`);
    });
    
    // Check if distribution is reasonably uniform
    const isUniform = stats.coefficient_of_variation < 10; // Less than 10% variation is good

    return { stats, isUniform };
  } catch (error) {
    console.error('Error testing kanji selection:', error);
  }
}