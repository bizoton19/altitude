/**
 * API Service
 * Connects the React frontend to the Python backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options.body instanceof FormData;
  const defaultOptions = {
    headers: isFormData ? {} : {
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      const errorMessage = error.detail || error.message || JSON.stringify(error) || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ============================================
// VIOLATIONS API (Primary)
// ============================================

/**
 * Get all violations with optional filtering
 */
export async function getViolations({ riskLevel, agencyName, country, violationType, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (riskLevel) params.append('risk_level', riskLevel);
  if (agencyName) params.append('agency_name', agencyName);
  if (country) params.append('country', country);
  if (violationType) params.append('violation_type', violationType);
  
  return fetchAPI(`/violations/?${params}`);
}

/**
 * Get risk summary (counts by level) for violations
 */
export async function getViolationsRiskSummary() {
  return fetchAPI('/violations/summary');
}

/**
 * Search violations by query
 */
export async function searchViolations(query, riskLevel = null, agencyName = null, country = null) {
  const params = new URLSearchParams({ q: query });
  if (riskLevel) params.append('risk_level', riskLevel);
  if (agencyName) params.append('agency_name', agencyName);
  if (country) params.append('country', country);
  
  return fetchAPI(`/violations/search?${params}`);
}

/**
 * Get a specific violation by ID
 */
export async function getViolation(violationId) {
  return fetchAPI(`/violations/${violationId}`);
}

/**
 * Get listings found for a violation
 */
export async function getViolationListings(violationId) {
  return fetchAPI(`/violations/${violationId}/listings`);
}

/**
 * Delete a single violation
 */
export async function deleteViolation(violationId) {
  return fetchAPI(`/violations/${violationId}`, {
    method: 'DELETE',
  });
}

/**
 * Delete all violations (bulk delete)
 */
export async function deleteAllViolations() {
  return fetchAPI('/violations', {
    method: 'DELETE',
  });
}

/**
 * Get violations by agency
 */
export async function getViolationsByAgency(agencyName) {
  return fetchAPI(`/violations/by-agency/${agencyName}`);
}

/**
 * Classify risk for given parameters
 */
export async function classifyViolationRisk(params) {
  return fetchAPI('/violations/classify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Create a new violation
 */
export async function createViolation(violationData) {
  return fetchAPI('/violations/', {
    method: 'POST',
    body: JSON.stringify(violationData),
  });
}

// ============================================
// INVESTIGATIONS API
// ============================================

/**
 * Get all investigations
 */
export async function getInvestigations({ status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status) params.append('status', status);
  return fetchAPI(`/investigations/?${params}`);
}

/**
 * Get a specific investigation by ID
 */
export async function getInvestigation(investigationId) {
  return fetchAPI(`/investigations/${investigationId}`);
}

/**
 * Create a new investigation
 */
export async function createInvestigation(investigationData) {
  return fetchAPI('/investigations/', {
    method: 'POST',
    body: JSON.stringify(investigationData),
  });
}

/**
 * Update an investigation
 */
export async function updateInvestigation(investigationId, updateData) {
  return fetchAPI(`/investigations/${investigationId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

/**
 * Delete an investigation
 */
export async function deleteInvestigation(investigationId) {
  return fetchAPI(`/investigations/${investigationId}`, {
    method: 'DELETE',
  });
}

/**
 * Manually trigger an investigation
 */
export async function runInvestigation(investigationId) {
  return fetchAPI(`/investigations/${investigationId}/run`, {
    method: 'POST',
  });
}

/**
 * Get listings found by an investigation
 */
export async function getInvestigationListings(investigationId) {
  return fetchAPI(`/investigations/${investigationId}/listings`);
}

/**
 * Get investigations for a specific violation
 */
export async function getInvestigationsByViolation(violationId) {
  return fetchAPI(`/investigations/by-violation/${violationId}`);
}

// ============================================
// REVIEWS API
// ============================================

/**
 * Get reviewer's queue
 */
export async function getReviewQueue({ marketplace_id, region_id, status = 'pending', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset, status });
  if (marketplace_id) params.append('marketplace_id', marketplace_id);
  if (region_id) params.append('region_id', region_id);
  
  const token = localStorage.getItem('firebase_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  return fetchAPI(`/reviews/queue?${params}`, { headers });
}

/**
 * Get a specific review
 */
export async function getReview(reviewId) {
  const token = localStorage.getItem('firebase_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetchAPI(`/reviews/${reviewId}`, { headers });
}

/**
 * Update a review
 */
export async function updateReview(reviewId, updateData) {
  const token = localStorage.getItem('firebase_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetchAPI(`/reviews/${reviewId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateData),
  });
}

/**
 * Assign a review to current user
 */
export async function assignReview(reviewId) {
  const token = localStorage.getItem('firebase_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetchAPI(`/reviews/${reviewId}/assign`, {
    method: 'POST',
    headers,
  });
}

/**
 * Get review statistics
 */
export async function getReviewStats() {
  const token = localStorage.getItem('firebase_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetchAPI('/reviews/stats/summary', { headers });
}

// ============================================
// RECALLS API (Backward Compatibility)
// ============================================

/**
 * Get all recalls with optional filtering
 */
export async function getRecalls({ riskLevel, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (riskLevel) params.append('risk_level', riskLevel);
  
  return fetchAPI(`/recalls/?${params}`);
}

/**
 * Get risk summary (counts by level)
 */
export async function getRiskSummary() {
  return fetchAPI('/recalls/summary');
}

/**
 * Search recalls by query
 */
export async function searchRecalls(query, riskLevel = null) {
  const params = new URLSearchParams({ q: query });
  if (riskLevel) params.append('risk_level', riskLevel);
  
  return fetchAPI(`/recalls/search?${params}`);
}

/**
 * Get a specific recall by ID
 */
export async function getRecall(recallId) {
  return fetchAPI(`/recalls/${recallId}`);
}

/**
 * Get listings found for a recall
 */
export async function getRecallListings(recallId) {
  return fetchAPI(`/recalls/${recallId}/listings`);
}

/**
 * Get all listings across all recalls
 */
export async function getAllListings() {
  return fetchAPI('/listings/');
}

/**
 * Classify risk for given parameters
 */
export async function classifyRisk(params) {
  return fetchAPI('/recalls/classify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================
// MARKETPLACES API
// ============================================

/**
 * Get all marketplaces
 */
export async function getMarketplaces(enabledOnly = false) {
  const params = new URLSearchParams({ enabled_only: enabledOnly });
  return fetchAPI(`/marketplaces/?${params}`);
}

/**
 * Get a specific marketplace
 */
export async function getMarketplace(marketplaceId) {
  return fetchAPI(`/marketplaces/${marketplaceId}`);
}

/**
 * Add a new marketplace
 */
export async function addMarketplace(marketplace) {
  return fetchAPI('/marketplaces/', {
    method: 'POST',
    body: JSON.stringify(marketplace),
  });
}

/**
 * Update marketplace settings
 */
export async function updateMarketplace(marketplaceId, updates) {
  return fetchAPI(`/marketplaces/${marketplaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Toggle marketplace enabled status
 */
export async function toggleMarketplace(marketplaceId) {
  return fetchAPI(`/marketplaces/${marketplaceId}/toggle`, {
    method: 'POST',
  });
}

// ============================================
// SEARCH API
// ============================================

/**
 * Search marketplaces for a recall
 */
export async function searchMarketplaces(recallId, marketplaceIds = []) {
  return fetchAPI('/search/marketplace', {
    method: 'POST',
    body: JSON.stringify({
      recall_id: recallId,
      marketplace_ids: marketplaceIds,
    }),
  });
}

/**
 * Create a background search task
 */
export async function createSearchTask(recallId, marketplaceIds = []) {
  return fetchAPI('/search/task', {
    method: 'POST',
    body: JSON.stringify({
      recall_id: recallId,
      marketplace_ids: marketplaceIds,
    }),
  });
}

/**
 * Get search task status
 */
export async function getTaskStatus(taskId) {
  return fetchAPI(`/search/task/${taskId}`);
}

/**
 * Preview search queries for a recall
 */
export async function previewSearchQuery(recallId) {
  return fetchAPI(`/search/query-preview/${recallId}`);
}

/**
 * Perform visual search
 */
export async function visualSearch(imageUrl, providers = null) {
  const params = new URLSearchParams({ image_url: imageUrl });
  if (providers) params.append('providers', providers.join(','));
  
  return fetchAPI(`/search/visual?${params}`, { method: 'POST' });
}

/**
 * Visual search using recall images
 */
export async function visualSearchRecall(recallId) {
  return fetchAPI(`/search/visual/recall/${recallId}`, { method: 'POST' });
}

// ============================================
// AGENT API
// ============================================

/**
 * Get agent configuration
 */
export async function getAgentConfig() {
  return fetchAPI('/agent/config');
}

/**
 * Update agent configuration
 */
export async function updateAgentConfig(updates) {
  return fetchAPI('/agent/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Get agent status
 */
export async function getAgentStatus() {
  return fetchAPI('/agent/status');
}

/**
 * Start the agent
 */
export async function startAgent() {
  return fetchAPI('/agent/start', { method: 'POST' });
}

/**
 * Stop the agent
 */
export async function stopAgent() {
  return fetchAPI('/agent/stop', { method: 'POST' });
}

/**
 * Get tool integrations
 */
export async function getToolIntegrations() {
  return fetchAPI('/agent/tools');
}

/**
 * List all agent skills
 */
export async function getAgentSkills() {
  return fetchAPI('/agent/skills');
}

/**
 * Get a specific skill
 */
export async function getAgentSkill(skillId) {
  return fetchAPI(`/agent/skills/${skillId}`);
}

/**
 * Create a new skill
 */
export async function createAgentSkill(skillData) {
  return fetchAPI('/agent/skills', {
    method: 'POST',
    body: JSON.stringify(skillData),
  });
}

/**
 * Update a skill
 */
export async function updateAgentSkill(skillId, updates) {
  return fetchAPI(`/agent/skills/${skillId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a skill
 */
export async function deleteAgentSkill(skillId) {
  return fetchAPI(`/agent/skills/${skillId}`, {
    method: 'DELETE',
  });
}

// ============================================
// IMPORT API
// ============================================

/**
 * Import listings in bulk (from text paste or URLs)
 */
export async function importListingsBulk(request) {
  return fetchAPI('/imports/listings/bulk', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Import listing from browser extension
 */
export async function importListingFromExtension(formData) {
  return fetchAPI('/imports/listings/from-extension', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Preview file and get schema information for mapping
 */
export async function previewViolationsFile(formData) {
  return fetchAPI('/imports/violations/file/preview', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Import violations from file (CSV or JSON)
 */
export async function importViolationsFromFile(formData) {
  return fetchAPI('/imports/violations/file', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Get import history
 */
export async function getImportHistory(importType = null, source = null, limit = 50, offset = 0) {
  const params = new URLSearchParams();
  if (importType) params.append('import_type', importType);
  if (source) params.append('source', source);
  params.append('limit', limit);
  params.append('offset', offset);
  return fetchAPI(`/imports/history?${params.toString()}`);
}

/**
 * Get import details
 */
export async function getImportDetails(importId) {
  return fetchAPI(`/imports/history/${importId}`);
}

/**
 * Update a tool integration
 */
export async function updateToolIntegration(toolType, enabled, apiKey = null) {
  const params = new URLSearchParams({ enabled });
  if (apiKey) params.append('api_key', apiKey);
  
  return fetchAPI(`/agent/tools/${toolType}?${params}`, { method: 'PATCH' });
}

/**
 * Test webhook configuration
 */
export async function testWebhook() {
  return fetchAPI('/agent/webhook/test', { method: 'POST' });
}

// ============================================
// RISK CLASSIFICATION API
// ============================================

/**
 * Get risk classification configuration
 */
export async function getRiskClassificationConfig() {
  return fetchAPI('/agent/skills/risk_classifier/config');
}

/**
 * Update risk classification configuration
 */
export async function updateRiskClassificationConfig(config) {
  return fetchAPI('/agent/skills/risk_classifier/config', {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

/**
 * Test risk classification against a sample violation
 */
export async function testRiskClassification(violation) {
  return fetchAPI('/agent/skills/risk_classifier/test', {
    method: 'POST',
    body: JSON.stringify(violation),
  });
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check API health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// ORGANIZATIONS API
// ============================================

/**
 * Get all organizations with optional filtering
 */
export async function getOrganizations({ organizationType, status, country } = {}) {
  const params = new URLSearchParams();
  if (organizationType) params.append('organization_type', organizationType);
  if (status) {
    // Convert status to lowercase to match enum values (active, pending, suspended, inactive)
    params.append('status', status.toLowerCase());
  }
  if (country) params.append('country', country);
  return fetchAPI(`/organizations?${params}`);
}

/**
 * Get a specific organization by ID
 */
export async function getOrganization(organizationId) {
  return fetchAPI(`/organizations/${organizationId}`);
}

/**
 * Get current user's organization
 */
export async function getCurrentOrganization() {
  return fetchAPI('/organizations/me/current');
}

/**
 * Create a new organization (company or regulatory agency)
 */
export async function createOrganization(organizationData) {
  return fetchAPI('/organizations', {
    method: 'POST',
    body: JSON.stringify(organizationData),
  });
}

/**
 * Update an organization
 */
export async function updateOrganization(organizationId, updates) {
  return fetchAPI(`/organizations/${organizationId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete an organization (soft delete)
 */
export async function deleteOrganization(organizationId) {
  return fetchAPI(`/organizations/${organizationId}`, {
    method: 'DELETE',
  });
}

export default {
  // Violations (Primary)
  getViolations,
  getViolationsRiskSummary,
  searchViolations,
  getViolation,
  getViolationListings,
  getViolationsByAgency,
  classifyViolationRisk,
  
  // Recalls (Backward Compatibility)
  getRecalls,
  getRiskSummary,
  searchRecalls,
  getRecall,
  getRecallListings,
  getAllListings,
  classifyRisk,
  
  // Marketplaces
  getMarketplaces,
  getMarketplace,
  addMarketplace,
  updateMarketplace,
  toggleMarketplace,
  
  // Search
  searchMarketplaces,
  createSearchTask,
  getTaskStatus,
  previewSearchQuery,
  visualSearch,
  visualSearchRecall,
  
  // Agent
  getAgentConfig,
  updateAgentConfig,
  getAgentStatus,
  startAgent,
  stopAgent,
  getToolIntegrations,
  updateToolIntegration,
  getAgentSkills,
  getAgentSkill,
  createAgentSkill,
  updateAgentSkill,
  deleteAgentSkill,
  testWebhook,
  
  // Risk Classification
  getRiskClassificationConfig,
  updateRiskClassificationConfig,
  testRiskClassification,
  // Imports
  importListingsBulk,
  importListingFromExtension,
  previewViolationsFile,
  importViolationsFromFile,
  getImportHistory,
  getImportDetails,
  
  // Violation deletion
  deleteViolation,
  deleteAllViolations,
  
  // Health
  checkHealth,
  
  // Organizations
  getOrganizations,
  getOrganization,
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
