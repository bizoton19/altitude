---
layout: default
title: User Guide
description: Complete user guide for Altitude - Learn how to manage listings, banned products, investigations, users, and settings.
---

# Altitude User Guide

Welcome to Altitude! This guide will walk you through all the features of the application for managing banned products across online marketplaces.

## Table of Contents

1. [Listings](#listings)
   - [Adding Listings](#adding-listings)
     - [Manual](#manual-adding-listings)
2. [Banned Products](#banned-products)
   - [Import Banned Products](#import-banned-products)
     - [Manual](#manual-import)
     - [Schedule/Automated](#scheduleautomated-import)
   - [Schedule Investigation](#schedule-investigation)
3. [Investigations](#investigations)
   - [History](#investigation-history)
   - [Create Investigation](#create-investigation)
4. [Users](#users)
   - [Manage Users](#manage-users-admins-only)
5. [Settings](#settings)

---

## Listings

The Listings section allows you to view, manage, and add marketplace listings that may contain banned products.

### Adding Listings

You can add listings to Altitude in two ways: manually or through automated investigations. Manual addition is useful when you discover a listing during browsing or when someone reports a potential banned product.

#### Manual Adding Listings

**When to Add Listings Manually:**

- You found a listing during manual browsing
- Someone reported a potential banned product listing
- You want to track a specific listing before creating an investigation
- Quick verification of a suspected banned product

**How to Add a Listing Manually:**

1. Navigate to **Listings → Add Listing**
2. Fill in listing details:
   - **Marketplace** - Select which marketplace (eBay, Amazon, Facebook Marketplace, etc.)
   - **Listing URL** - Paste the listing URL
   - **Product Name** - Enter the product name from the listing
   - **Seller Information** - Add seller details if available
   - **Price** - Enter listing price
   - **Location** - Add geographic location if relevant
   - **Images** - Upload or link product images
   - **Description** - Copy listing description
3. **Link to Banned Product** - Select which banned product this listing matches (optional)
4. **Risk Level** - System will show the risk level of the linked banned product
5. Click **Save** to add the listing

**Managing Manual Listings:**

- View all manually added listings in the Listings section
- Edit listing details after creation
- Mark listings as verified or false positive
- Export listing data for reports
- Generate takedown requests from listings

**Reviewing Flagged Listings:**

When automated investigations find potential matches, listings are automatically flagged for review:

1. Navigate to **Listings → Flagged for Review**
2. **View Flagged Listings** - See all listings that were automatically flagged
   - Filter by risk level, marketplace, or date
   - Sort by priority or match confidence
3. **Review Listing Details** - Click on any listing to see full details
   - View original listing URL and images
   - See which banned product it matches
   - Review match confidence score
4. **Verify the Match** - Compare listing details with banned product information
5. **Take Action:**
   - **If Match is Verified:** Mark as Verified Match, export for takedown, generate compliance report
   - **If Not a Match:** Mark as False Positive (system learns from this)
   - **If Needs More Review:** Add notes for later review

**Bulk Actions:**

For efficiency, you can perform bulk actions on listings:
- **Bulk Verify** - Mark multiple listings as verified matches
- **Bulk Export** - Export multiple listings for takedown requests
- **Bulk Mark False Positive** - Clear false positives in bulk
- **Bulk Assign** - Assign listings to team members for review

---

## Banned Products

The Banned Products section is where you manage all products that have been banned or recalled. This includes importing products, scheduling investigations, and viewing product details.

### Import Banned Products

You can import banned products from regulatory feeds or upload files manually. The system automatically classifies each product by risk level (HIGH, MEDIUM, LOW) based on injuries, deaths, units affected, and hazard types.

#### Manual Import

**Import from File:**

1. Navigate to **Banned Products → Import**
2. Select **Upload File**
3. Choose file format (CSV or JSON)
4. Upload your file or paste data
5. **Map Fields** to Altitude's banned product structure:
   - Product name
   - Manufacturer
   - Model numbers
   - Ban reason/description
   - Dates
   - Hazard information
   - Units affected
   - Injury/death counts
6. **Preview the Import** to verify data before importing
7. Click **Import** to complete

**File Format Requirements:**

**CSV Format:**
- Column headers should include: Name, Manufacturer, Model, Reason, Date, Risk Level, etc.
- First row must contain headers
- Data rows follow below

**JSON Format:**
- Array of banned product objects
- Each object should contain product details
- Follow Altitude's banned product schema

**After Manual Import:**

- Banned products are automatically classified by risk level
- Review imported products in the Banned Products list
- Edit products to add missing information
- Use imported products in investigations

#### Schedule/Automated Import

**Import from Regulatory Feeds:**

1. Navigate to **Banned Products → Import**
2. Select **Import from Feed**
3. Choose the regulatory source:
   - FDA feed
   - NHTSA feed
   - Other supported regulatory feeds
4. **Configure Import Settings:**
   - Date range for imports
   - Auto-classify risk levels
   - Update existing products or create new ones
   - Schedule automatic imports (daily, weekly, monthly)
5. **Set Schedule:**
   - Choose frequency: Daily, Weekly, Monthly
   - Select time of day for imports
   - Enable/disable automatic imports
6. Click **Save Schedule** to activate automated imports

**Automated Import Features:**

- Runs automatically at scheduled times
- Imports new banned products from regulatory feeds
- Updates existing products with new information
- Sends notifications when imports complete
- Logs import history for audit purposes

**Managing Scheduled Imports:**

- View all scheduled import configurations
- Edit schedule frequency and timing
- Pause or resume scheduled imports
- View import history and logs
- Manually trigger imports outside of schedule

### Schedule Investigation

Schedule investigations to automatically monitor marketplaces for specific banned products. This is one of Altitude's most powerful features for automating your monitoring workflow.

**Creating a Scheduled Investigation:**

1. Navigate to **Banned Products → Schedule Investigation**
2. **Select Banned Products** - Choose which banned products to monitor
   - You can select multiple products
   - Filter by risk level if desired
3. **Choose Marketplaces** - Select which marketplaces to monitor:
   - eBay
   - Facebook Marketplace
   - Amazon
   - Craigslist
   - OfferUp
   - Mercari
4. **Set Schedule:**
   - **Daily** - Runs every day at the same time (recommended for HIGH-risk products)
   - **Weekly** - Runs once per week on the same day
   - **Biweekly** - Runs every 2 weeks
   - **Monthly** - Runs monthly on the same date
   - **One-Time** - Runs once at the specified time
5. **Configure Start Time** - Choose when to start the investigation
6. **Regional Settings** (optional):
   - For Facebook Marketplace and Craigslist, select specific regions
   - Leave empty to monitor all regions
7. **Name and Description** - Give your investigation a clear, descriptive name
8. Click **Create Investigation** to schedule

**Investigation Schedule Recommendations:**

- **HIGH Risk Products:** Daily investigations
- **MEDIUM Risk Products:** Weekly or biweekly investigations
- **LOW Risk Products:** Monthly investigations
- **Urgent Searches:** One-time investigations

**Managing Scheduled Investigations:**

- View all scheduled investigations
- Edit investigation settings (products, marketplaces, schedule)
- Pause or cancel investigations
- View investigation history and results
- Manually trigger investigations outside of schedule

**Investigation Results:**

When investigations complete:
- Listings that match banned products are automatically flagged
- Review flagged listings in the Listings section
- Export results for compliance reports
- Track investigation effectiveness over time

---

## Investigations

The Investigations section provides a complete view of all investigation activity, including history, results, and the ability to create new investigations.

### Investigation History

**Viewing Investigation History:**

1. Navigate to **Investigations → History**
2. **Filter Investigations:**
   - By status (Scheduled, Running, Completed, Failed, Cancelled)
   - By date range
   - By banned products monitored
   - By marketplace
   - By creator
3. **View Investigation Details:**
   - Click on any investigation to see full details
   - Current status and next scheduled run time
   - Number of listings found
   - History of previous runs
   - Error messages if investigation failed

**Investigation Status Types:**

- **Scheduled** - Waiting to run at the scheduled time
- **Running** - Currently executing the search
- **Completed** - Finished successfully with results
- **Failed** - Encountered an error during execution
   - Check error details for troubleshooting
   - Review server logs if needed
- **Cancelled** - Stopped and will not run again

**Investigation Results:**

- View all listings found by each investigation
- See match confidence scores
- Export results as CSV, JSON, or PDF
- Generate compliance reports
- Track investigation effectiveness

**Troubleshooting Failed Investigations:**

1. Check investigation details for error information
2. Review server logs for detailed error messages
3. Verify all required data exists:
   - Banned products must exist and be valid
   - Marketplaces must be enabled
   - Network connectivity to marketplaces
4. Try updating the investigation and running it again

### Create Investigation

**Creating a New Investigation:**

1. Navigate to **Investigations → Create Investigation**
2. **Basic Information:**
   - **Name** - Give your investigation a clear, descriptive name
   - **Description** - Add notes about what this investigation monitors
3. **Select Banned Products:**
   - Choose which banned products to search for
   - You can select multiple products
   - Filter by risk level if desired
4. **Choose Marketplaces:**
   - Select which marketplaces to monitor
   - Enable/disable specific platforms
   - Configure regional settings if needed
5. **Set Schedule:**
   - Choose frequency: Daily, Weekly, Biweekly, Monthly, or One-Time
   - Select start time
   - Configure timezone if needed
6. **Advanced Options (optional):**
   - Regional targeting for specific marketplaces
   - Custom search parameters
   - Notification preferences
7. Click **Create Investigation** to save

**Investigation Best Practices:**

- **Start Small** - Begin with a few high-priority banned products
- **Choose Appropriate Schedules** - Match frequency to risk level
- **Be Specific** - Don't investigate too many products at once
- **Use Descriptive Names** - Makes it easier to find and manage investigations
- **Review Results Regularly** - Check completed investigations for new listings

**Editing Investigations:**

- Update name, description, schedule, or target banned products
- Modify marketplace selection or start time
- Changes automatically reschedule the investigation
- Pause investigations temporarily without cancelling

**Cancelling Investigations:**

- Stop an investigation permanently
- Cancelled investigations will not run again
- Scheduled jobs are removed from the system
- Historical data is preserved

---

## Users

The Users section allows administrators to manage user accounts, permissions, and access levels.

### Manage Users (Admins Only)

**Accessing User Management:**

1. Navigate to **Users → Manage Users**
2. Only administrators can access this section
3. View all user accounts in the system

**User Management Features:**

**View Users:**
- See all registered users
- Filter by role (Admin, User, Viewer)
- Search by name or email
- View user activity and last login

**Add New Users:**
1. Click **Add User**
2. Enter user information:
   - Name
   - Email address
   - Role (Admin, User, Viewer)
   - Initial password (user can change later)
3. Set permissions:
   - Can create investigations
   - Can import banned products
   - Can manage listings
   - Can access API
4. Click **Create User**

**Edit Users:**
- Update user information (name, email)
- Change user role
- Modify permissions
- Reset passwords
- Enable/disable accounts

**User Roles:**

- **Admin** - Full access to all features including user management
- **User** - Can create investigations, import products, manage listings
- **Viewer** - Read-only access to view data and reports

**User Permissions:**

- **Create Investigations** - Allow user to schedule investigations
- **Import Banned Products** - Allow user to import products
- **Manage Listings** - Allow user to add/edit listings
- **API Access** - Allow user to use API endpoints
- **Export Data** - Allow user to export reports and data

**Deactivate Users:**
- Temporarily disable user accounts
- Deactivated users cannot log in
- Historical data is preserved
- Can be reactivated later

**Delete Users:**
- Permanently remove user accounts
- Requires confirmation
- Historical data may be preserved or removed based on settings
- Use with caution

---

## Settings

The Settings section allows you to configure application preferences, notifications, marketplace settings, and system behavior.

**Accessing Settings:**

Navigate to **Settings** from the main menu.

### Marketplace Settings

**Configure Marketplaces:**

1. Navigate to **Settings → Marketplaces**
2. **Enable/Disable Platforms:**
   - Toggle marketplaces on or off
   - Disabled marketplaces won't be included in investigations
3. **Marketplace Agreements:**
   - View and manage agreements with each marketplace
   - Add agreement details, terms, and expiration dates
   - Track agreement status and compliance requirements
4. **Contact Information:**
   - Add marketplace contact details for takedown requests
   - Store contact names, email addresses, and phone numbers
   - Organize contacts by department or function
5. **Regional Settings:**
   - Configure regional targeting for marketplaces that support it
   - For Facebook Marketplace and Craigslist, select specific regions
   - Leave empty to monitor all regions
6. **API Keys (Optional):**
   - Add API keys for enhanced marketplace access
   - Some marketplaces offer better search capabilities with API access
   - API keys are stored securely

**Supported Marketplaces:**

- eBay - Product listings and auctions
- Facebook Marketplace - Local and regional listings
- Amazon - Product search and listings
- Craigslist - Multi-region classifieds
- OfferUp - Local marketplace
- Mercari - Online marketplace

### Notification Settings

**Configure Notifications:**

1. Navigate to **Settings → Notifications**
2. **Email Notifications:**
   - Enable/disable email alerts
   - Set notification frequency
   - Choose which events trigger notifications
3. **Notification Types:**
   - Investigation completed
   - HIGH-risk findings
   - Scheduled import completed
   - System alerts
   - Weekly summary reports
4. **Notification Preferences:**
   - Real-time alerts for HIGH-risk findings
   - Daily digest emails
   - Weekly summary reports
   - Custom notification rules

### Risk Classification Settings

**Configure Risk Classification:**

1. Navigate to **Settings → Risk Classification**
2. **View Risk Calculation Methodology:**
   - See how risk levels are calculated
   - Understand risk scoring factors
3. **Risk Thresholds (if applicable):**
   - Adjust risk level thresholds
   - Customize risk classification rules
4. **Review Risk Classification Rules:**
   - HIGH risk criteria
   - MEDIUM risk criteria
   - LOW risk criteria

### User Preferences

**Personalize Your Experience:**

1. Navigate to **Settings → User Preferences**
2. **Display Preferences:**
   - Theme (Light, Dark, Auto)
   - Font size
   - Layout preferences
3. **Language Settings:**
   - Interface language
   - Date and time format
   - Number format
4. **Export Format Defaults:**
   - Default export format (CSV, JSON, PDF)
   - Export preferences

### System Settings

**Administrative Settings:**

1. Navigate to **Settings → System Settings**
2. **User Management:**
   - Manage user accounts (admins only)
   - Configure user roles and permissions
3. **API Configuration:**
   - API key management
   - Rate limiting settings
   - Webhook configuration
4. **Data Retention Policies:**
   - Configure data retention periods
   - Archive old investigations
   - Data cleanup settings
5. **Backup and Restore:**
   - Schedule automatic backups
   - Manual backup and restore
   - Export system data

### Best Practices for Settings

- **Keep Marketplace Agreements Current** - Update expiration dates and renewals
- **Organize Contacts** - Maintain up-to-date contact information for faster takedown requests
- **Test API Keys** - Verify API keys are working before running large investigations
- **Review Regional Settings** - Ensure regional targeting matches your jurisdiction
- **Configure Notifications** - Set up alerts that match your workflow needs
- **Regular Backups** - Schedule automatic backups for important data

---

## Understanding Risk Levels

Altitude automatically classifies each banned product by risk level to help you prioritize your monitoring efforts.

### HIGH RISK 🔴

**Priority: Immediate Action**

- Deaths reported
- Serious injuries
- More than 10,000 units affected
- Hazards: fire, electrocution, choking, lead poisoning, strangulation

**Recommendation:** Set up daily investigations for HIGH-risk banned products.

### MEDIUM RISK 🟡

**Priority: Monitor Regularly**

- Minor injuries reported
- 1,000 - 10,000 units affected
- Hazards: cuts, burns, falls, tip-over

**Recommendation:** Weekly or biweekly investigations are usually sufficient.

### LOW RISK 🟢

**Priority: Periodic Checks**

- No injuries reported
- Fewer than 1,000 units affected
- Minor defects, labeling issues

**Recommendation:** Monthly investigations or manual searches when needed.

---

## Need Help?

For additional support:

- **API Documentation** - See [API Documentation]({{ '/api.html' | relative_url }}) for programmatic access
- **Contact Support** - Use the [Contact Form]({{ '/contact.html' | relative_url }}) for questions
- **GitHub Repository** - Check the repository for technical details

---

*Last updated: January 2025*
