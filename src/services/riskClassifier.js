/**
 * Risk Classification Service
 * Classifies recalls as HIGH, MEDIUM, or LOW risk based on:
 * - Number of units sold
 * - Severity of injuries
 * - Type of hazards
 */

/**
 * Extract number of units from Products array
 * @param {Array} products - Products array from recall
 * @returns {number} Number of units, or 0 if not found
 */
function extractUnits(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return 0;
  }

  // Look for NumberOfUnits in products
  for (const product of products) {
    if (product.NumberOfUnits) {
      const unitsStr = product.NumberOfUnits.toString();
      // Extract numbers from strings like "About 2,800" or "2,800" or "2800"
      const match = unitsStr.match(/[\d,]+/);
      if (match) {
        const number = parseInt(match[0].replace(/,/g, ''), 10);
        if (!isNaN(number)) {
          return number;
        }
      }
    }
  }

  return 0;
}

/**
 * Analyze injuries for severity
 * @param {Array} injuries - Injuries array from recall
 * @returns {Object} Object with hasDeath, hasSeriousInjury, hasMinorInjury flags
 */
function analyzeInjuries(injuries) {
  const result = {
    hasDeath: false,
    hasSeriousInjury: false,
    hasMinorInjury: false,
    injuryCount: 0
  };

  if (!injuries || !Array.isArray(injuries)) {
    return result;
  }

  const injuryKeywords = {
    death: ['death', 'died', 'fatal', 'fatality', 'killed'],
    serious: ['serious', 'severe', 'hospital', 'hospitalized', 'emergency', 'critical', 'life-threatening'],
    minor: ['minor', 'cut', 'bruise', 'scratch', 'burn', 'fall']
  };

  injuries.forEach(injury => {
    const injuryText = (injury.Name || JSON.stringify(injury)).toLowerCase();
    
    // Check for "None reported" or similar
    if (injuryText.includes('none') || injuryText.includes('no injuries')) {
      return;
    }

    result.injuryCount++;

    // Check for death keywords
    if (injuryKeywords.death.some(keyword => injuryText.includes(keyword))) {
      result.hasDeath = true;
    }

    // Check for serious injury keywords
    if (injuryKeywords.serious.some(keyword => injuryText.includes(keyword))) {
      result.hasSeriousInjury = true;
    }

    // Check for minor injury keywords
    if (injuryKeywords.minor.some(keyword => injuryText.includes(keyword))) {
      result.hasMinorInjury = true;
    }
  });

  return result;
}

/**
 * Extract hazard keywords from text
 * @param {string} text - Text to analyze
 * @returns {Object} Object with hazard type flags
 */
function extractHazards(text) {
  if (!text) {
    return {
      hasLifeThreateningHazard: false,
      hasModerateHazard: false
    };
  }

  const textLower = text.toLowerCase();

  const lifeThreateningHazards = [
    'fire', 'electrocution', 'electrical shock', 'choking', 'lead poisoning',
    'carbon monoxide', 'explosion', 'asphyxiation', 'strangulation',
    'tip-over', 'entrapment', 'death', 'fatal', 'life-threatening'
  ];

  const moderateHazards = [
    'cut', 'laceration', 'burn', 'fall', 'injury', 'pinch', 'crush'
  ];

  const hasLifeThreateningHazard = lifeThreateningHazards.some(
    hazard => textLower.includes(hazard)
  );

  const hasModerateHazard = moderateHazards.some(
    hazard => textLower.includes(hazard)
  );

  return {
    hasLifeThreateningHazard,
    hasModerateHazard
  };
}

/**
 * Classify recall risk level
 * @param {Object} recall - Recall object
 * @returns {string} Risk level: 'HIGH', 'MEDIUM', or 'LOW'
 */
export function classifyRisk(recall) {
  if (!recall) {
    return 'LOW';
  }

  // Extract units sold
  const units = extractUnits(recall.Products || []);

  // Analyze injuries
  const injuries = analyzeInjuries(recall.Injuries || []);

  // Extract hazards from description and title
  const description = recall.Description || '';
  const title = recall.Title || '';
  const combinedText = `${title} ${description}`;
  const hazards = extractHazards(combinedText);

  // HIGH RISK criteria:
  // - Units sold > 10,000 OR
  // - Death or serious injury reported OR
  // - Life-threatening hazard
  if (
    units > 10000 ||
    injuries.hasDeath ||
    injuries.hasSeriousInjury ||
    hazards.hasLifeThreateningHazard
  ) {
    return 'HIGH';
  }

  // MEDIUM RISK criteria:
  // - Units sold 1,000 - 10,000 OR
  // - Minor injuries reported OR
  // - Moderate hazards
  if (
    (units >= 1000 && units <= 10000) ||
    injuries.hasMinorInjury ||
    injuries.injuryCount > 0 ||
    hazards.hasModerateHazard
  ) {
    return 'MEDIUM';
  }

  // LOW RISK: Everything else
  return 'LOW';
}

/**
 * Get risk level color class
 * @param {string} riskLevel - Risk level ('HIGH', 'MEDIUM', 'LOW')
 * @returns {string} CSS class name
 */
export function getRiskColorClass(riskLevel) {
  switch (riskLevel) {
    case 'HIGH':
      return 'risk-badge-high';
    case 'MEDIUM':
      return 'risk-badge-medium';
    case 'LOW':
      return 'risk-badge-low';
    default:
      return 'risk-badge-low';
  }
}

/**
 * Get risk level label
 * @param {string} riskLevel - Risk level ('HIGH', 'MEDIUM', 'LOW')
 * @returns {string} Human-readable label
 */
export function getRiskLabel(riskLevel) {
  switch (riskLevel) {
    case 'HIGH':
      return 'High Risk';
    case 'MEDIUM':
      return 'Medium Risk';
    case 'LOW':
      return 'Low Risk';
    default:
      return 'Unknown Risk';
  }
}

