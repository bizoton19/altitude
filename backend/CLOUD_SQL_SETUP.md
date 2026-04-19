# Google Cloud SQL Setup Guide

This guide explains how to configure Altitude to use Google Cloud SQL (PostgreSQL).

## Connection Details

- **Instance connection name** (GCP Cloud SQL): `YOUR_PROJECT_ID:YOUR_REGION:altitudedb1`  
  The **instance ID** is `altitudedb1`; replace `YOUR_PROJECT_ID` and `YOUR_REGION` with your GCP project and region.
- **Database**: `altitude`
- **Username**: `your_username`
- **Password**: `your_password_here` (set in `.env` file, not in this file)

## Local PostgreSQL (Docker, not SQLite)

From the **repository root**, start Postgres (matches [`docker-compose.yml`](../docker-compose.yml): user `altitude`, database `altitude`, port `5432`):

```bash
docker compose up -d postgres
```

Then run the API against Postgres (clears Cloud SQL env overrides so `DATABASE_URL` wins):

```bash
cd backend
./run_postgres_local.sh
```

Or from the repo root: `pnpm run backend:postgres`

Override the URL if needed:

```bash
DATABASE_URL=postgresql+asyncpg://user:pass@127.0.0.1:5432/altitude ./run_postgres_local.sh
```

## Quick Setup

### Option 1: Using the Setup Script (Recommended)

```bash
cd backend
./setup_cloud_sql.sh
```

This script will:
- Create/update your `.env` file with Cloud SQL configuration
- Install the `asyncpg` driver if needed

### Option 2: Manual Setup

1. **Create/Update `.env` file** in the `backend` directory:

```bash
# Google Cloud SQL Configuration
CLOUD_SQL_INSTANCE=your-project-id:your-region:altitudedb1
CLOUD_SQL_DATABASE=altitude
CLOUD_SQL_USER=your_username
CLOUD_SQL_PASSWORD=your_password_here
CLOUD_SQL_USE_UNIX_SOCKET=true
```

2. **Install dependencies**:

```bash
pip install asyncpg>=0.29.0
```

## Connection Methods

### Unix Socket (Recommended for GCP)

When running on Google Cloud Platform (Cloud Run, GKE, Compute Engine), use Unix socket connections:

```env
CLOUD_SQL_USE_UNIX_SOCKET=true
```

**Requirements:**
- Service account with Cloud SQL Client role
- Cloud SQL Proxy installed (if not using built-in connector)

### IP Connection (For Local Development)

When running locally, you can use Cloud SQL Proxy or direct IP connection:

1. **Install Cloud SQL Proxy**:
   ```bash
   # macOS
   brew install cloud-sql-proxy
   
   # Or download from: https://cloud.google.com/sql/docs/postgres/sql-proxy
   ```

2. **Start the proxy**:
   ```bash
   cloud_sql_proxy -instances=YOUR_PROJECT_ID:YOUR_REGION:altitudedb1=tcp:5432
   ```

3. **Update `.env`**:
   ```env
   CLOUD_SQL_USE_UNIX_SOCKET=false
   # Or use direct DATABASE_URL:
   DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/altitude
   ```
   
   **⚠️ Important**: Never commit `.env` files with real credentials. Use `.env.example` for documentation.

## Testing the Connection

Run the test script to verify everything is working:

```bash
cd backend
python test_db_connection.py
```

This will:
- Test the database connection
- Create all database tables (schema)
- Initialize seed data (default marketplaces and agent config)

## Database Schema

The application will automatically create the following tables on first startup:

- `violations` - Main violation/recall records
- `violation_products` - Products associated with violations
- `violation_hazards` - Hazards identified
- `violation_remedies` - Remediation actions
- `violation_images` - Product images
- `marketplaces` - Marketplace configurations
- `marketplace_listings` - Found listings
- `investigations` - Investigation records
- `investigation_listings` - Links between investigations and listings
- `import_history` - Import tracking
- `agent_config` - Agent configuration
- `search_tasks` - Search task tracking
- `organizations` - Organization records

## Seed Data

On first startup, the application automatically seeds:

1. **Default Marketplaces** - Pre-configured marketplace entries
2. **Default Agent Config** - Basic agent configuration with risk classification skill

## Troubleshooting

### Connection Errors

**Error: "Connection refused" or "Can't connect to server"**

- Verify Cloud SQL instance is running
- Check that Cloud SQL Proxy is running (if using local development)
- Verify network connectivity

**Error: "Authentication failed"**

- Double-check username and password in `.env`
- Ensure the user exists in Cloud SQL
- Check password encoding (special characters like `@` should be URL-encoded as `%40`)

**Error: "Database does not exist"**

- Verify `CLOUD_SQL_DATABASE` matches the actual database name
- Create the database if it doesn't exist:
  ```sql
  CREATE DATABASE altitude;
  ```

### Permission Errors

**Error: "Permission denied"**

- Ensure service account has "Cloud SQL Client" role
- For local development, ensure your user has proper IAM permissions

### Schema Creation Errors

**Error: "Table already exists"**

- This is normal if the database was previously initialized
- The application will skip creating existing tables

## Production Considerations

1. **Connection Pooling**: The application uses connection pooling (20 connections, max 30 overflow)
2. **SSL**: Unix socket connections don't require SSL configuration
3. **Backups**: Ensure Cloud SQL automated backups are enabled
4. **Monitoring**: Set up Cloud SQL monitoring and alerts
5. **Secrets Management**: Consider using Google Secret Manager for passwords in production

## Additional Resources

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs/postgres)
- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [SQLAlchemy AsyncPG Documentation](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html#asyncpg)

