/**
 * Export Utilities
 * Functions for exporting recall and marketplace data
 */

/**
 * Export data as CSV
 * @param {Object} recall - Recall object
 * @param {Array} marketplaceResults - Marketplace results array
 */
export function exportToCSV(recall, marketplaceResults = []) {
  if (!recall) return

  const rows = []

  // Header row
  rows.push([
    'Recall Number',
    'Recall Date',
    'Title',
    'Product Name',
    'Units',
    'Risk Level',
    'Manufacturer',
    'Retailer',
    'Injuries',
    'Description'
  ])

  // Recall data row
  const productName = recall.Products?.[0]?.Name || 'N/A'
  const units = recall.Products?.[0]?.NumberOfUnits || 'Unknown'
  const manufacturer = recall.Manufacturers?.map(m => m.Name).join('; ') || 'N/A'
  const retailer = recall.Retailers?.map(r => r.Name).join('; ') || 'N/A'
  const injuries = recall.Injuries?.map(i => i.Name).join('; ') || 'None'

  rows.push([
    recall.RecallNumber || '',
    recall.RecallDate || '',
    recall.Title || '',
    productName,
    units,
    '', // Risk level will be calculated
    manufacturer,
    retailer,
    injuries,
    (recall.Description || '').replace(/\n/g, ' ')
  ])

  // Marketplace results
  if (marketplaceResults.length > 0) {
    rows.push([]) // Empty row
    rows.push(['Marketplace Results'])
    rows.push([
      'Platform',
      'Listing Title',
      'Price',
      'Availability',
      'Seller',
      'Location',
      'Match Score'
    ])

    marketplaceResults.forEach(platformResult => {
      platformResult.listings.forEach(listing => {
        rows.push([
          platformResult.platformName,
          listing.title,
          listing.price,
          listing.availability,
          listing.seller,
          listing.location,
          `${(listing.matchScore * 100).toFixed(0)}%`
        ])
      })
    })
  }

  // Convert to CSV string
  const csvContent = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `recall-${recall.RecallNumber || 'export'}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export data as JSON
 * @param {Object} recall - Recall object
 * @param {Array} marketplaceResults - Marketplace results array
 */
export function exportToJSON(recall, marketplaceResults = []) {
  if (!recall) return

  const exportData = {
    recall: recall,
    marketplaceResults: marketplaceResults,
    exportDate: new Date().toISOString()
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `recall-${recall.RecallNumber || 'export'}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export data as PDF
 * @param {Object} recall - Recall object
 * @param {Array} marketplaceResults - Marketplace results array
 */
export async function exportToPDF(recall, marketplaceResults = []) {
  if (!recall) return

  // Dynamic import of jsPDF
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  let y = 20
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  const maxWidth = doc.internal.pageSize.width - (margin * 2)

  // Title
  doc.setFontSize(16)
  doc.text('Recall Information', margin, y)
  y += 10

  // Recall details
  doc.setFontSize(12)
  doc.text(`Recall Number: ${recall.RecallNumber || 'N/A'}`, margin, y)
  y += 7
  doc.text(`Recall Date: ${recall.RecallDate || 'N/A'}`, margin, y)
  y += 7
  doc.text(`Title: ${recall.Title || 'N/A'}`, margin, y)
  y += 7

  // Description (wrap text)
  doc.setFontSize(10)
  const description = doc.splitTextToSize(
    `Description: ${recall.Description || 'N/A'}`,
    maxWidth
  )
  doc.text(description, margin, y)
  y += description.length * 5

  // Check if we need a new page
  if (y > pageHeight - 40) {
    doc.addPage()
    y = 20
  }

  // Product info
  doc.setFontSize(12)
  if (recall.Products && recall.Products.length > 0) {
    const product = recall.Products[0]
    doc.text(`Product: ${product.Name || 'N/A'}`, margin, y)
    y += 7
    doc.text(`Units: ${product.NumberOfUnits || 'Unknown'}`, margin, y)
    y += 7
  }

  // Marketplace results
  if (marketplaceResults.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.text('Marketplace Results', margin, y)
    y += 10

    doc.setFontSize(10)
    marketplaceResults.forEach(platformResult => {
      if (y > pageHeight - 40) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.text(platformResult.platformName, margin, y)
      y += 7

      doc.setFontSize(10)
      platformResult.listings.forEach(listing => {
        if (y > pageHeight - 30) {
          doc.addPage()
          y = 20
        }

        doc.text(`- ${listing.title}`, margin + 5, y)
        y += 5
        doc.text(`  Price: ${listing.price} | ${listing.availability}`, margin + 5, y)
        y += 5
      })
      y += 3
    })
  }

  // Save PDF
  doc.save(`recall-${recall.RecallNumber || 'export'}.pdf`)
}

