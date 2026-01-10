---
layout: default
title: User Guide
description: Complete user guide for Altitude - AI-powered product recall monitoring. Learn how to create investigations, manage schedules, and monitor marketplaces.
---

# Altitude User Guide

Welcome to Altitude! This guide will help you get started with AI-powered product recall monitoring.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Scheduled Investigations](#scheduled-investigations)
4. [Managing Investigations](#managing-investigations)
5. [Marketplace Monitoring](#marketplace-monitoring)
6. [Understanding Risk Levels](#understanding-risk-levels)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is Altitude?

Altitude is an AI-powered platform that helps you monitor product recalls across online marketplaces. It automatically searches platforms like eBay, Facebook Marketplace, Amazon, and Craigslist to find recalled products that are still being sold.

### First Steps

1. **Launch the Application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

2. **Create Your First Violation**
   - Start by importing or creating a product recall violation
   - The system will automatically classify the risk level

3. **Set Up Marketplaces**
   - Go to Settings → Marketplaces
   - Enable the platforms you want to monitor
   - Configure any API keys if needed

4. **Create Your First Investigation**
   - Set up a scheduled investigation to automatically search for violations
   - Choose your schedule: daily, weekly, biweekly, monthly, or one-time

---

## Core Concepts

### Violations

A **violation** represents a product recall. Each violation contains:
- Product information (name, manufacturer, model numbers)
- Recall details (date, number, description)
- Hazard information
- Risk classification (HIGH, MEDIUM, or LOW)

### Investigations

An **investigation** is a scheduled search that automatically monitors marketplaces for specific violations. Investigations can:
- Search multiple violations at once
- Monitor multiple marketplaces simultaneously
- Run on a recurring schedule
- Generate listings when matches are found

### Listings

**Listings** are marketplace posts that potentially match recalled products. When an investigation finds matches, they appear as listings that you can review, verify, and take action on.

---

## Scheduled Investigations

The Investigation Scheduler is one of Altitude's most powerful features. It allows you to automate your monitoring workflow so you don't have to manually search marketplaces every day.

### What are Scheduled Investigations?

Scheduled investigations run automatically at specified times to search marketplaces for recalled products. When configured, they will:

1. **Search automatically** - Run at the scheduled time without manual intervention
2. **Generate findings** - Create listings when potential matches are discovered
3. **Track results** - Record how many listings were found
4. **Reschedule automatically** - Set up the next run for recurring schedules

### Creating Your First Investigation

#### Using the API

Create an investigation by sending a POST request to `/api/investigations/`:

```bash
curl -X POST "http://localhost:8000/api/investigations/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily High-Risk Monitor",
    "description": "Monitor for HIGH risk recalls daily at 8 AM",
    "schedule": "daily",
    "scheduled_start_time": "2024-01-15T08:00:00Z",
    "violation_ids": ["violation-123", "violation-456"],
    "marketplace_ids": ["ebay", "facebook", "amazon"],
    "region_ids": {
      "facebook": ["dc", "seattle"],
      "ebay": []
    }
  }'
```

#### Investigation Configuration

**Required Fields:**
- **name**: A clear, descriptive name (e.g., "Daily CPSC Monitor")
- **schedule**: One of: `daily`, `weekly`, `biweekly`, `monthly`, or `custom`
- **scheduled_start_time**: When to run (ISO 8601 format)
- **violation_ids**: Array of violation IDs to search for
- **marketplace_ids**: Array of marketplace IDs to monitor

**Optional Fields:**
- **description**: Additional context or notes
- **region_ids**: Specific regions to focus on (empty array = all regions)
- **agent_id**: Assign a specific AI agent to perform the investigation

### Schedule Types

Choose the frequency that works best for your needs:

#### Daily
Perfect for high-priority recalls that need constant monitoring. Runs every day at the same time.

**Example:** Monitor for dangerous toys every morning at 9 AM.

#### Weekly
Ideal for ongoing compliance monitoring. Runs once per week on the same day.

**Example:** Weekly audit of all active recalls every Monday.

#### Biweekly
Good for regular checks without overloading the system. Runs every 2 weeks.

**Example:** Check for recalled electronics twice per month.

#### Monthly
Suitable for periodic audits and low-priority monitoring. Runs monthly on the same date.

**Example:** Monthly compliance review of all violations.

#### Custom (One-Time)
For one-off searches or testing. Runs once at the specified time and doesn't reschedule.

**Example:** Search for a specific product immediately after a recall is announced.

---

## Managing Investigations

### Viewing Your Investigations

List all investigations:
```
GET /api/investigations/
```

Filter by status:
```
GET /api/investigations/?status=scheduled
GET /api/investigations/?status=completed
GET /api/investigations/?status=running
```

Filter by creator:
```
GET /api/investigations/?created_by=user-123
```

### Viewing Investigation Details

Get information about a specific investigation:
```
GET /api/investigations/{investigation_id}
```

You'll see:
- Current status
- Next scheduled run time
- Number of listings found
- History of previous runs

### Updating an Investigation

Need to change your investigation? Update it with a PATCH request:

```bash
PATCH /api/investigations/{investigation_id}
```

You can update:
- Name and description
- Schedule frequency
- Next run time
- Target violations
- Marketplace selection
- Status

**Important:** When you update an investigation, it automatically reschedules with the new settings.

### Cancelling an Investigation

To stop an investigation permanently:

```bash
PATCH /api/investigations/{investigation_id}
{
  "status": "cancelled"
}
```

Cancelled investigations will not run again and their scheduled jobs are removed from the system.

### Investigation Status

Investigations progress through these statuses:

- **`scheduled`** - Waiting to run at the scheduled time
- **`running`** - Currently executing the search
- **`completed`** - Finished successfully with results
- **`failed`** - Encountered an error during execution
- **`cancelled`** - Stopped and will not run again

---

## Marketplace Monitoring

### Supported Marketplaces

Altitude can monitor these popular platforms:

- **eBay** - Product listings and auctions
- **Facebook Marketplace** - Local and regional listings
- **Amazon** - Product search and listings
- **Craigslist** - Multi-region classifieds
- **OfferUp** - Local marketplace
- **Mercari** - Online marketplace

### Configuring Marketplaces

1. Navigate to **Settings → Marketplaces**
2. Toggle platforms on/off as needed
3. Configure regional settings if you want to focus on specific areas
4. Add API keys for enhanced access (optional)

### Regional Targeting

For marketplaces like Facebook and Craigslist, you can target specific regions:

```json
{
  "region_ids": {
    "facebook": ["dc", "seattle", "nyc"],
    "craigslist": ["seattle", "portland"],
    "ebay": []  // Empty array = all regions
  }
}
```

This helps you focus your searches on areas where you have jurisdiction or where products are commonly sold.

---

## Understanding Risk Levels

Altitude automatically classifies each violation with a risk level to help you prioritize your monitoring efforts.

### HIGH RISK 🔴

**Priority: Immediate Action**

Indicators:
- Deaths reported
- Serious injuries
- More than 10,000 units affected
- Hazards: fire, electrocution, choking, lead poisoning, strangulation

**Recommendation:** Set up daily investigations for HIGH risk violations.

### MEDIUM RISK 🟡

**Priority: Monitor Regularly**

Indicators:
- Minor injuries reported
- 1,000 - 10,000 units affected
- Hazards: cuts, burns, falls, tip-over

**Recommendation:** Weekly or biweekly investigations are usually sufficient.

### LOW RISK 🟢

**Priority: Periodic Checks**

Indicators:
- No injuries reported
- Fewer than 1,000 units affected
- Minor defects, labeling issues

**Recommendation:** Monthly investigations or manual searches when needed.

### How Risk is Calculated

The risk score (0.0 - 1.0) is calculated using:

- **Deaths:** +0.4 base, +0.15 per death
- **Injuries:** +0.05 per injury (max 0.4)
- **Incidents:** +0.01 per incident (max 0.2)
- **Units Sold:** +0.02 to +0.15 based on volume
- **Hazard Keywords:** +0.1 per high-severity term

---

## Best Practices

### Investigation Setup

1. **Start Small**
   - Begin with a few high-priority violations
   - Use weekly or biweekly schedules initially
   - Monitor 2-3 marketplaces to start

2. **Choose Appropriate Schedules**
   - Daily for HIGH risk violations
   - Weekly for MEDIUM risk
   - Monthly for LOW risk
   - One-time (custom) for urgent searches

3. **Be Specific with Scope**
   - Don't investigate too many violations at once
   - Use regional targeting when relevant
   - Select marketplaces where products are actually sold

### Resource Management

1. **Schedule Strategically**
   - Spread investigations across different times
   - Avoid running everything at once
   - Consider off-peak hours for large investigations

2. **Monitor System Performance**
   - Check investigation status regularly
   - Review completion times
   - Adjust schedules if investigations take too long

3. **Keep Investigations Current**
   - Update or cancel investigations that are no longer needed
   - Review and adjust schedules based on results
   - Remove completed one-time investigations

### Workflow Tips

1. **Review Findings Regularly**
   - Check completed investigations for new listings
   - Verify matches before taking action
   - Export results for reporting

2. **Use Descriptive Names**
   - Name investigations clearly (e.g., "Daily Toy Recalls - High Risk")
   - Include date ranges or product types in names
   - Makes it easier to find and manage investigations

3. **Document Your Process**
   - Add descriptions to investigations explaining why they exist
   - Note any special configurations
   - Track which investigations are most effective

---

## Troubleshooting

### My Investigation Isn't Running

**Check these things:**

1. **Status Check**
   - Verify the investigation status is `scheduled`
   - Status must be `scheduled` for it to run automatically

2. **Time Check**
   - Ensure `scheduled_start_time` is in the future
   - Check timezone settings

3. **System Check**
   - Verify the scheduler is running (it starts with the app)
   - Check server logs for errors
   - Ensure the backend is running and accessible

4. **Dependencies**
   - Verify all referenced violations exist
   - Check that marketplaces are enabled
   - Ensure the investigation wasn't cancelled

### Investigation Failed

**If an investigation fails:**

1. Check the investigation details for error information
2. Review server logs for detailed error messages
3. Verify all required data exists:
   - Violations must exist and be valid
   - Marketplaces must be enabled
   - Network connectivity to marketplaces
4. Try updating the investigation and running it again

### Too Many Results (or Too Few)

**Adjust your scope:**

- **Too many results:** Narrow your focus
  - Fewer violations per investigation
  - Specific regional targeting
  - Focus on high-priority marketplaces

- **Too few results:** Expand your search
  - Include more marketplaces
  - Add more regions
  - Check that violations match marketplace products

### Investigation Running Too Often

**If investigations seem to run more frequently than expected:**

1. Verify the `schedule` type is correct
2. Check that you haven't accidentally created duplicate investigations
3. Review the `calculate_next_run_time` logic for your schedule type
4. Check server logs to see actual run times

### Performance Issues

**If investigations are slow or timing out:**

1. Reduce the scope:
   - Fewer violations per investigation
   - Fewer marketplaces
   - Smaller regional areas

2. Split large investigations:
   - Create separate investigations for different violations
   - Separate by marketplace
   - Separate by region

3. Adjust schedules:
   - Spread investigations across different times
   - Avoid peak usage times
   - Consider off-peak hours for large searches

---

## Next Steps

Now that you understand the basics, you can:

- **Set up your first scheduled investigation** using the examples above
- **Explore the API** at `http://localhost:8000/docs` for more advanced features
- **Configure marketplaces** in Settings to match your monitoring needs
- **Review investigation results** to see what the system finds

### Additional Resources

- **API Documentation:** `http://localhost:8000/docs` - Full API reference with interactive testing
- **Main Documentation:** [Back to main docs](./index.html) - Overview and features
- **Code Repository:** Check the repository for examples and code samples

---

## Support

If you encounter issues or have questions:

1. Check this guide first
2. Review the API documentation
3. Check server logs for error details
4. Review the investigation scheduler documentation in the codebase

---

*Last updated: January 2024*

