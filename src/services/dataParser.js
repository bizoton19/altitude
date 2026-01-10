/**
 * Data Parser Service
 * Handles loading and parsing of recalls.json data
 */

let recallsCache = null;
let recallsIndex = null;

/**
 * Parse recalls.json file
 * @returns {Promise<Array>} Array of recall objects
 */
export async function parseRecallsData() {
  if (recallsCache) {
    return recallsCache;
  }

  try {
    const response = await fetch('/recalls.json');
    if (!response.ok) {
      throw new Error(`Failed to load recalls.json: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('recalls.json must contain an array of recalls');
    }

    recallsCache = data;
    buildIndex(data);
    
    return data;
  } catch (error) {
    console.error('Error parsing recalls data:', error);
    throw error;
  }
}

/**
 * Build index for fast lookup by RecallNumber
 * @param {Array} recalls - Array of recall objects
 */
function buildIndex(recalls) {
  recallsIndex = new Map();
  recalls.forEach(recall => {
    if (recall.RecallNumber) {
      const normalizedNumber = recall.RecallNumber.toString().trim().toUpperCase();
      if (!recallsIndex.has(normalizedNumber)) {
        recallsIndex.set(normalizedNumber, []);
      }
      recallsIndex.get(normalizedNumber).push(recall);
    }
  });
}

/**
 * Search recalls by recall number(s)
 * @param {Array} recalls - Array of all recalls
 * @param {string|Array} recallNumbers - Single recall number or array of numbers
 * @returns {Array} Array of matching recall objects
 */
export function searchRecalls(recalls, recallNumbers) {
  if (!recalls || recalls.length === 0) {
    return [];
  }

  // Normalize input to array
  let numbers = [];
  if (typeof recallNumbers === 'string') {
    // Handle comma-separated or newline-separated
    numbers = recallNumbers
      .split(/[,\n]/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
  } else if (Array.isArray(recallNumbers)) {
    numbers = recallNumbers.map(n => String(n).trim()).filter(n => n.length > 0);
  } else {
    return [];
  }

  // Build index if not already built
  if (!recallsIndex && recalls.length > 0) {
    buildIndex(recalls);
  }

  // Search using index
  const results = [];
  const seenIds = new Set();

  numbers.forEach(number => {
    const normalizedNumber = number.toUpperCase();
    const matches = recallsIndex?.get(normalizedNumber) || [];
    
    matches.forEach(recall => {
      if (!seenIds.has(recall.RecallID)) {
        seenIds.add(recall.RecallID);
        results.push(recall);
      }
    });
  });

  return results;
}

/**
 * Get recall by ID
 * @param {number} recallId - Recall ID
 * @returns {Object|null} Recall object or null
 */
export function getRecallById(recallId) {
  if (!recallsCache) {
    return null;
  }
  return recallsCache.find(r => r.RecallID === recallId) || null;
}

/**
 * Get recall by recall number
 * @param {string} recallNumber - Recall number
 * @returns {Array} Array of matching recalls
 */
export function getRecallByNumber(recallNumber) {
  if (!recallsIndex) {
    return [];
  }
  const normalizedNumber = recallNumber.toString().trim().toUpperCase();
  return recallsIndex.get(normalizedNumber) || [];
}

/**
 * Clear cache (useful for testing or reloading)
 */
export function clearCache() {
  recallsCache = null;
  recallsIndex = null;
}

