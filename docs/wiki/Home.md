---
layout: default
title: User Guide
description: Complete user guide for Altitude - Learn how to manage listings, banned products, investigations, users, and settings.
---

# Altitude User Guide

Welcome to Altitude! This guide will walk you through all the features of the application for managing banned products across online marketplaces.

## Quick Navigation

### Core Features
- [[Listings]] - Manage and review marketplace listings
- [[Banned Products]] - Import and manage banned products
- [[Investigations]] - Create and monitor automated investigations
- [[Users]] - User management (admins only)
- [[Settings]] - Configure application settings

### Getting Started

1. Start by [[Banned-Products#manual-import|importing banned products]]
2. [[Investigations#create-investigation|Create your first investigation]]
3. [[Listings#reviewing-flagged-listings|Review flagged listings]]
4. [[Settings#marketplace-settings|Configure marketplaces]]

## Overview

Altitude streamlines your entire banned product management process from detection to takedown:

**Import → Investigate → Notify → Takedown**

### Complete Workflow

1. **Import Banned Products** - Automatically import from FDA, NHTSA, and other regulatory feeds, or upload manually via CSV/JSON
2. **Schedule Investigations** - Automatically monitor marketplaces (eBay, Amazon, Facebook, Craigslist, etc.) for banned products
3. **Review Flagged Listings** - System automatically flags listings that match banned products for your review
4. **Export & Takedown** - Export verified listings for marketplace takedown requests and compliance reporting

## Understanding Risk Levels

Altitude automatically classifies banned products by risk level:

- **HIGH RISK 🔴** - Deaths, serious injuries, 10,000+ units. Schedule daily investigations.
- **MEDIUM RISK 🟡** - Minor injuries, 1,000-10,000 units. Weekly/biweekly investigations.
- **LOW RISK 🟢** - No injuries, <1,000 units. Monthly investigations.

See [[Understanding-Risk-Levels]] for detailed information about how risk classification works.

## Detailed Guides

### [[Listings]]

Learn how to:
- Add listings manually
- Review flagged listings from automated investigations
- Verify matches and mark false positives
- Export listings for takedown requests
- Perform bulk actions on multiple listings

### [[Banned Products]]

Learn how to:
- Import banned products from files (CSV/JSON)
- Configure automated imports from regulatory feeds
- Schedule investigations for specific banned products
- View and manage banned product data
- Understand automatic risk classification

### [[Investigations]]

Learn how to:
- Create new investigations
- View investigation history and results
- Schedule recurring investigations (daily, weekly, monthly)
- Troubleshoot failed investigations
- Monitor investigation effectiveness

### [[Users]]

Learn how to:
- Manage user accounts (admins only)
- Set user roles and permissions
- Add, edit, and deactivate users
- Configure user access levels

### [[Settings]]

Learn how to:
- Configure marketplace settings
- Set up notifications
- Customize risk classification
- Configure user preferences
- Manage system settings

## Need Help?

- [API Documentation]({{ '/api.html' | relative_url }}) - For developers and API access
- [Contact Support]({{ '/contact.html' | relative_url }}) - Use the contact form for questions
- [GitHub Repository](https://github.com/bizoton19/altitude) - Check the repository for technical details

---

*Last updated: January 2025*
