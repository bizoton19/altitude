# Investigations

The Investigations section provides a complete view of all investigation activity, including history, results, and the ability to create new investigations.

## Investigation History

### Viewing Investigation History

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

### Investigation Status Types

- **Scheduled** - Waiting to run at the scheduled time
- **Running** - Currently executing the search
- **Completed** - Finished successfully with results
- **Failed** - Encountered an error during execution
  - Check error details for troubleshooting
  - Review server logs if needed
- **Cancelled** - Stopped and will not run again

### Investigation Results

- View all listings found by each investigation
- See match confidence scores
- Export results as CSV, JSON, or PDF
- Generate compliance reports
- Track investigation effectiveness

### Troubleshooting Failed Investigations

1. Check investigation details for error information
2. Review server logs for detailed error messages
3. Verify all required data exists:
   - Banned products must exist and be valid
   - Marketplaces must be enabled
   - Network connectivity to marketplaces
4. Try updating the investigation and running it again

## Create Investigation

### Creating a New Investigation

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

### Investigation Best Practices

- **Start Small** - Begin with a few high-priority banned products
- **Choose Appropriate Schedules** - Match frequency to risk level
- **Be Specific** - Don't investigate too many products at once
- **Use Descriptive Names** - Makes it easier to find and manage investigations
- **Review Results Regularly** - Check completed investigations for new listings

### Editing Investigations

- Update name, description, schedule, or target banned products
- Modify marketplace selection or start time
- Changes automatically reschedule the investigation
- Pause investigations temporarily without cancelling

### Cancelling Investigations

- Stop an investigation permanently
- Cancelled investigations will not run again
- Scheduled jobs are removed from the system
- Historical data is preserved

---

**Related:** [[Banned Products]] | [[Listings]] | [[Settings]]
