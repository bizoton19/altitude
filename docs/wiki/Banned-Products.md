# Banned Products

The Banned Products section is where you manage all products that have been banned or recalled. This includes importing products, scheduling investigations, and viewing product details.

## Import Banned Products

You can import banned products from regulatory feeds or upload files manually. The system automatically classifies each product by risk level (HIGH, MEDIUM, LOW) based on injuries, deaths, units affected, and hazard types.

## Manual Import

### Import from File

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

### File Format Requirements

**CSV Format:**
- Column headers should include: Name, Manufacturer, Model, Reason, Date, Risk Level, etc.
- First row must contain headers
- Data rows follow below

**JSON Format:**
- Array of banned product objects
- Each object should contain product details
- Follow Altitude's banned product schema

### After Manual Import

- Banned products are automatically classified by risk level
- Review imported products in the Banned Products list
- Edit products to add missing information
- Use imported products in investigations

## Schedule/Automated Import

### Import from Regulatory Feeds

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

### Automated Import Features

- Runs automatically at scheduled times
- Imports new banned products from regulatory feeds
- Updates existing products with new information
- Sends notifications when imports complete
- Logs import history for audit purposes

### Managing Scheduled Imports

- View all scheduled import configurations
- Edit schedule frequency and timing
- Pause or resume scheduled imports
- View import history and logs
- Manually trigger imports outside of schedule

## Schedule Investigation

Schedule investigations to automatically monitor marketplaces for specific banned products. This is one of Altitude's most powerful features for automating your monitoring workflow.

### Creating a Scheduled Investigation

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

### Investigation Schedule Recommendations

- **HIGH Risk Products:** Daily investigations
- **MEDIUM Risk Products:** Weekly or biweekly investigations
- **LOW Risk Products:** Monthly investigations
- **Urgent Searches:** One-time investigations

### Managing Scheduled Investigations

- View all scheduled investigations
- Edit investigation settings (products, marketplaces, schedule)
- Pause or cancel investigations
- View investigation history and results
- Manually trigger investigations outside of schedule

### Investigation Results

When investigations complete:
- Listings that match banned products are automatically flagged
- Review flagged listings in the Listings section
- Export results for compliance reports
- Track investigation effectiveness over time

---

**Related:** [[Investigations]] | [[Listings]] | [[Settings]]
