---
layout: default
title: Home
description: AI-powered product recall monitoring across marketplaces. Protect consumers with intelligent risk classification and automated marketplace scanning.
---

## ⚡ Altitude

<div class="hero">
  <p class="tagline">AI-Powered Product Recall Monitoring</p>
  <p class="subtitle">
    Automatically monitor eBay, Amazon, Facebook Marketplace, and more for recalled products. 
    Protect consumers with intelligent risk classification and scheduled investigations that never miss a recall.
  </p>
  <div class="cta-buttons">
    <a href="{{ site.baseurl }}/#features" class="cta-button">Explore Features</a>
    <a href="{{ '/userguide.html' | relative_url }}" class="cta-button secondary">Read User Guide</a>
  </div>
  
  <!-- Screenshot Placeholder - Add screenshot.png to docs folder -->
  <div class="screenshot-container" style="max-width: 900px; margin: 3rem auto 0;">
    {% if site.screenshot %}
    <img src="{{ site.screenshot }}" alt="Altitude Dashboard" style="width: 100%; height: auto; border-radius: 8px;">
    {% else %}
    <div class="screenshot-placeholder">
      📸 Add screenshot.png to the docs folder to display the application interface
    </div>
    {% endif %}
  </div>
</div>

## Why Altitude?

<div class="benefits-grid">
  <div class="benefit-card">
    <div class="benefit-icon">🤖</div>
    <h4>AI-Powered Automation</h4>
    <p>Set it and forget it. Schedule investigations to run daily, weekly, or monthly. The AI agent automatically searches marketplaces and generates listings for review.</p>
  </div>
  
  <div class="benefit-card">
    <div class="benefit-icon">⚡</div>
    <h4>Real-Time Risk Classification</h4>
    <p>Every recall is automatically classified as HIGH, MEDIUM, or LOW risk based on injuries, deaths, units affected, and hazard types. Prioritize what matters most.</p>
  </div>
  
  <div class="benefit-card">
    <div class="benefit-icon">🛒</div>
    <h4>Multi-Marketplace Coverage</h4>
    <p>Monitor eBay, Amazon, Facebook Marketplace, Craigslist, OfferUp, Mercari, and more from a single platform. All findings in one place.</p>
  </div>
  
  <div class="benefit-card">
    <div class="benefit-icon">📊</div>
    <h4>Export & API Integration</h4>
    <p>Download results as CSV, JSON, or PDF. Integrate with your existing systems via REST API. Full programmatic access available.</p>
  </div>
  
  <div class="benefit-card">
    <div class="benefit-icon">🔍</div>
    <h4>Visual Search Support</h4>
    <p>Find products by image using Google Vision or TinEye. OCR extraction identifies model numbers and brands for precise matching.</p>
  </div>
  
  <div class="benefit-card">
    <div class="benefit-icon">🔌</div>
    <h4>MCP Integration</h4>
    <p>Built-in Model Context Protocol server for AI agent integration. Works seamlessly with Claude Desktop and other compatible AI systems.</p>
  </div>
</div>

## Getting Started

Get up and running in minutes with Altitude's intuitive setup process.

### Quick Start (3 Steps)

1. **Create Violations** — Import or create product recall violations. The system automatically classifies risk levels.
2. **Enable Marketplaces** — Configure which platforms to monitor in Settings. Toggle eBay, Facebook, Amazon, and more.
3. **Schedule Investigations** — Set up automated searches that run on your schedule. Daily, weekly, monthly, or one-time.

<div class="cta-buttons" style="margin-top: 2rem;">
  <a href="{{ '/userguide.html' | relative_url }}" class="cta-button">View Complete User Guide</a>
  <a href="http://localhost:8000/docs" class="cta-button secondary" target="_blank">Explore API Docs</a>
</div>

## Key Features

### 🔍 Universal Search
Search by recall number, product name, manufacturer, or hazard keywords. Find what you need instantly.

### ⚠️ Risk Classification
Automatic severity scoring based on injuries, deaths, and units sold. Focus on HIGH risk recalls first.

### 🛒 Marketplace Monitoring
Search eBay, Amazon, Facebook, Craigslist, OfferUp, Mercari, and more for recalled products still being sold.

### 🤖 AI Agent
Automated scanning with configurable frequency and sensitivity. Runs continuously without manual intervention.

### 🖼️ Visual Search
Use Google Vision or TinEye to find products by image. Perfect for identifying recalled products from photos.

### 📊 Export & Reports
Download findings as CSV, JSON, or PDF. Generate reports for compliance and auditing.

## Risk Classification

Recalls are automatically classified based on severity factors:

### <span class="risk-badge risk-high">● HIGH RISK</span>

- Deaths reported OR serious injuries
- More than 10,000 units affected
- Hazards: fire, electrocution, choking, lead poisoning, strangulation

**Recommendation:** Set up daily investigations for HIGH risk violations.

### <span class="risk-badge risk-medium">● MEDIUM RISK</span>

- Minor injuries reported
- 1,000 - 10,000 units affected
- Hazards: cuts, burns, falls, tip-over

**Recommendation:** Weekly or biweekly investigations are usually sufficient.

### <span class="risk-badge risk-low">● LOW RISK</span>

- No injuries reported
- Fewer than 1,000 units affected
- Minor defects, labeling issues

**Recommendation:** Monthly investigations or manual searches when needed.

## Supported Marketplaces

Altitude can monitor these popular platforms:

| Platform | Status | Notes |
|----------|--------|-------|
| Facebook Marketplace | ✅ Supported | Rate limited to 5 req/min |
| eBay | ✅ Supported | API or scraping |
| Amazon | ✅ Supported | Product search |
| Craigslist | ✅ Supported | Multi-region search |
| OfferUp | ✅ Supported | Local listings |
| Mercari | ✅ Supported | Product matching |

## Scheduled Investigations

The Investigation Scheduler is one of Altitude's most powerful features. Automatically search for recalled products on a recurring schedule:

- **Daily** — Perfect for high-priority recalls that need constant monitoring
- **Weekly** — Ideal for ongoing compliance monitoring
- **Biweekly** — Good for regular checks without overloading the system
- **Monthly** — Suitable for periodic audits and low-priority monitoring
- **Custom** — One-time searches for urgent situations

[Learn more about scheduled investigations in the User Guide →]({{ '/userguide.html#scheduled-investigations' | relative_url }})

## API Access

Altitude exposes a comprehensive REST API for programmatic access:

- **Base URL:** `http://localhost:8000/api`
- **Interactive Docs:** `http://localhost:8000/docs`
- **Endpoints:** Recalls, violations, investigations, marketplaces, listings

[View complete API documentation →](http://localhost:8000/docs)

## MCP Integration

Altitude includes a Model Context Protocol (MCP) server for AI agent integration:

- Works with Claude Desktop and other compatible AI systems
- 11+ MCP tools available for recall search, risk classification, and marketplace monitoring
- Skills power the tools but aren't exposed directly

Perfect for building AI-powered workflows around product recall monitoring.

## Next Steps

Ready to get started? Check out the [User Guide]({{ '/userguide.html' | relative_url }}) for detailed instructions on:

- Setting up your first investigation
- Configuring marketplaces
- Understanding risk levels
- Managing scheduled investigations
- API usage examples

Or explore the [API documentation](http://localhost:8000/docs) for programmatic access.

---

<div style="text-align: center; margin-top: 3rem; padding: 2rem; background: var(--color-glass-bg); border-radius: 12px; border: 1px solid var(--color-glass-border);">
  <h3 style="margin-top: 0;">Questions or Need Help?</h3>
  <p>Check out the <a href="{{ '/userguide.html' | relative_url }}" style="color: var(--color-accent-cyan);">User Guide</a> for detailed documentation, or visit the <a href="http://localhost:8000/docs" target="_blank" style="color: var(--color-accent-cyan);">API documentation</a> for technical details.</p>
</div>

