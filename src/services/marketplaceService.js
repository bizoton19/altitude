/**
 * Marketplace Service
 * Mock marketplace search service with realistic listings and URLs
 */

// Platform URL patterns
const PLATFORM_URLS = {
  facebook: 'https://www.facebook.com/marketplace/item/',
  ebay: 'https://www.ebay.com/itm/',
  amazon: 'https://www.amazon.com/dp/',
  craigslist: 'https://craigslist.org/search/',
  offerup: 'https://offerup.com/item/detail/',
  mercari: 'https://www.mercari.com/us/item/',
  walmart: 'https://www.walmart.com/ip/',
  wayfair: 'https://www.wayfair.com/furniture/',
  target: 'https://www.target.com/p/',
  etsy: 'https://www.etsy.com/listing/'
}

/**
 * Generate mock marketplace results
 * @param {Object} recall - Recall object
 * @param {Array} platformIds - Array of platform IDs to search
 * @returns {Promise<Array>} Array of marketplace results
 */
export async function searchMarketplaces(recall, platformIds) {
  if (!recall || !platformIds || platformIds.length === 0) {
    return []
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

  const results = []

  // Generate mock results for each platform
  platformIds.forEach(platformId => {
    const platformResults = generateMockResults(recall, platformId)
    results.push(platformResults)
  })

  return results
}

/**
 * Generate mock results for a platform
 * @param {Object} recall - Recall object
 * @param {string} platformId - Platform ID
 * @returns {Object} Platform results object
 */
function generateMockResults(recall, platformId) {
  const platformNames = {
    facebook: 'Facebook Marketplace',
    ebay: 'eBay',
    amazon: 'Amazon',
    craigslist: 'Craigslist',
    offerup: 'OfferUp',
    mercari: 'Mercari',
    walmart: 'Walmart',
    wayfair: 'Wayfair',
    target: 'Target',
    etsy: 'Etsy'
  }

  const productName = recall.Products?.[0]?.Name || recall.Title || 'Product'
  const baseUrl = PLATFORM_URLS[platformId] || '#'
  
  // Randomly decide if this platform has results (60% chance)
  const hasResults = Math.random() > 0.4
  const listingCount = hasResults ? Math.floor(Math.random() * 4) + 1 : 0

  const listings = []
  const sellers = generateSellerNames(platformId)
  
  for (let i = 0; i < listingCount; i++) {
    const basePrice = Math.floor(Math.random() * 150) + 20
    const price = `$${basePrice}.${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`
    
    const availability = Math.random() > 0.3 ? 'In Stock' : 'Limited Stock'
    const matchScore = (0.65 + Math.random() * 0.35).toFixed(2)
    const listingId = Math.random().toString(36).substring(2, 12)

    // Generate realistic listing titles
    const titleVariants = [
      productName,
      `${productName} - Like New`,
      `${productName} - Great Condition`,
      `Used ${productName}`,
      `${productName} (Brand New)`,
      `${productName} - Must Go!`
    ]

    listings.push({
      id: `${platformId}-${listingId}`,
      title: titleVariants[Math.floor(Math.random() * titleVariants.length)],
      price: price,
      url: `${baseUrl}${listingId}`,
      availability: availability,
      matchScore: parseFloat(matchScore),
      seller: sellers[Math.floor(Math.random() * sellers.length)],
      location: getRandomLocation(),
      imageUrl: recall.Images?.[0]?.URL || null,
      listingDate: getRandomListingDate()
    })
  }

  return {
    platform: platformId,
    platformName: platformNames[platformId] || platformId,
    listings: listings,
    searchDate: new Date().toISOString()
  }
}

/**
 * Generate seller names based on platform
 */
function generateSellerNames(platformId) {
  const genericSellers = [
    'HomeGoods_Outlet',
    'FurnitureDealz',
    'BestPriceStore',
    'ClearanceKing',
    'DealFinder2024',
    'QuickSeller99'
  ]
  
  const platformSpecific = {
    facebook: ['Local Seller', 'Moving Sale', 'Estate Sale', 'Family Deals'],
    ebay: ['power_seller_99', 'top_rated_plus', 'deals_warehouse', 'liquidation_hub'],
    amazon: ['Third Party Seller', 'Marketplace Vendor', 'Fulfilled by Amazon'],
    craigslist: ['Local Owner', 'Moving - Must Sell', 'No Dealers'],
    mercari: ['quick_shipper', 'verified_seller', 'top_rated_mercari']
  }

  return platformSpecific[platformId] || genericSellers
}

/**
 * Get random location
 */
function getRandomLocation() {
  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'Fort Worth, TX',
    'Columbus, OH',
    'Charlotte, NC'
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}

/**
 * Get random listing date (within last 30 days)
 */
function getRandomListingDate() {
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Get marketplace result summary
 * @param {Array} results - Marketplace results array
 * @returns {Object} Summary statistics
 */
export function getMarketplaceSummary(results) {
  const totalListings = results.reduce((sum, r) => sum + r.listings.length, 0)
  const platformsSearched = results.length
  const platformsWithResults = results.filter(r => r.listings.length > 0).length

  return {
    totalListings,
    platformsSearched,
    platformsWithResults,
    platformsWithoutResults: platformsSearched - platformsWithResults
  }
}

  
  const platformSpecific = {
    facebook: ['Local Seller', 'Moving Sale', 'Estate Sale', 'Family Deals'],
    ebay: ['power_seller_99', 'top_rated_plus', 'deals_warehouse', 'liquidation_hub'],
    amazon: ['Third Party Seller', 'Marketplace Vendor', 'Fulfilled by Amazon'],
    craigslist: ['Local Owner', 'Moving - Must Sell', 'No Dealers'],
    mercari: ['quick_shipper', 'verified_seller', 'top_rated_mercari']
  }

  return platformSpecific[platformId] || genericSellers
}

/**
 * Get random location
 */
function getRandomLocation() {
  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'Fort Worth, TX',
    'Columbus, OH',
    'Charlotte, NC'
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}

/**
 * Get random listing date (within last 30 days)
 */
function getRandomListingDate() {
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Get marketplace result summary
 * @param {Array} results - Marketplace results array
 * @returns {Object} Summary statistics
 */
export function getMarketplaceSummary(results) {
  const totalListings = results.reduce((sum, r) => sum + r.listings.length, 0)
  const platformsSearched = results.length
  const platformsWithResults = results.filter(r => r.listings.length > 0).length

  return {
    totalListings,
    platformsSearched,
    platformsWithResults,
    platformsWithoutResults: platformsSearched - platformsWithResults
  }
}

  
  const platformSpecific = {
    facebook: ['Local Seller', 'Moving Sale', 'Estate Sale', 'Family Deals'],
    ebay: ['power_seller_99', 'top_rated_plus', 'deals_warehouse', 'liquidation_hub'],
    amazon: ['Third Party Seller', 'Marketplace Vendor', 'Fulfilled by Amazon'],
    craigslist: ['Local Owner', 'Moving - Must Sell', 'No Dealers'],
    mercari: ['quick_shipper', 'verified_seller', 'top_rated_mercari']
  }

  return platformSpecific[platformId] || genericSellers
}

/**
 * Get random location
 */
function getRandomLocation() {
  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'Fort Worth, TX',
    'Columbus, OH',
    'Charlotte, NC'
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}

/**
 * Get random listing date (within last 30 days)
 */
function getRandomListingDate() {
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Get marketplace result summary
 * @param {Array} results - Marketplace results array
 * @returns {Object} Summary statistics
 */
export function getMarketplaceSummary(results) {
  const totalListings = results.reduce((sum, r) => sum + r.listings.length, 0)
  const platformsSearched = results.length
  const platformsWithResults = results.filter(r => r.listings.length > 0).length

  return {
    totalListings,
    platformsSearched,
    platformsWithResults,
    platformsWithoutResults: platformsSearched - platformsWithResults
  }
}

  
  const platformSpecific = {
    facebook: ['Local Seller', 'Moving Sale', 'Estate Sale', 'Family Deals'],
    ebay: ['power_seller_99', 'top_rated_plus', 'deals_warehouse', 'liquidation_hub'],
    amazon: ['Third Party Seller', 'Marketplace Vendor', 'Fulfilled by Amazon'],
    craigslist: ['Local Owner', 'Moving - Must Sell', 'No Dealers'],
    mercari: ['quick_shipper', 'verified_seller', 'top_rated_mercari']
  }

  return platformSpecific[platformId] || genericSellers
}

/**
 * Get random location
 */
function getRandomLocation() {
  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
    'Austin, TX',
    'Jacksonville, FL',
    'Fort Worth, TX',
    'Columbus, OH',
    'Charlotte, NC'
  ]
  return locations[Math.floor(Math.random() * locations.length)]
}

/**
 * Get random listing date (within last 30 days)
 */
function getRandomListingDate() {
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/**
 * Get marketplace result summary
 * @param {Array} results - Marketplace results array
 * @returns {Object} Summary statistics
 */
export function getMarketplaceSummary(results) {
  const totalListings = results.reduce((sum, r) => sum + r.listings.length, 0)
  const platformsSearched = results.length
  const platformsWithResults = results.filter(r => r.listings.length > 0).length

  return {
    totalListings,
    platformsSearched,
    platformsWithResults,
    platformsWithoutResults: platformsSearched - platformsWithResults
  }
}
