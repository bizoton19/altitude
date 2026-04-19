# Google Cloud SQL Setup Guide

Use **Google Cloud SQL (PostgreSQL)** for the API database. The app builds the connection string from `CLOUD_SQL_*` variables in `backend/.env` (see [`app/config.py`](app/config.py)).

**Without** those variables, the default is **SQLite** (`./altitude.db`) via `DATABASE_URL` — fine for quick local work, not for matching production.

## Run the API with Google Cloud SQL

### 1. Configure `backend/.env`

Set at least (use your real project, region, user, and password):

```env
# Instance connection name (GCP console → Cloud SQL → your instance → "Connection name")
CLOUD_SQL_INSTANCE=YOUR_PROJECT_ID:YOUR_REGION:altitudedb1
CLOUD_SQL_DATABASE=altitude
CLOUD_SQL_USER=your_username
CLOUD_SQL_PASSWORD=your_password_here
```

### 2. Choose how the app reaches Cloud SQL

**On GCP** (Cloud Run, GKE, Compute Engine with the Cloud SQL connector / Unix socket):

```env
CLOUD_SQL_USE_UNIX_SOCKET=true
```

**On your laptop** (Cloud SQL Auth Proxy listening on `localhost:5432`):

```env
CLOUD_SQL_USE_UNIX_SOCKET=false
CLOUD_SQL_HOST=127.0.0.1
CLOUD_SQL_PORT=5432
```

Start the proxy in another terminal (instance ID example: `altitudedb1`):

```bash
cloud-sql-proxy --port 5432 "YOUR_PROJECT_ID:YOUR_REGION:altitudedb1"
```

(Older binaries used `cloud_sql_proxy -instances=...=tcp:5432` — same idea.)

### 3. Start the backend

```bash
cd backend
./run_cloud_sql.sh
```

From the repo root:

```bash
pnpm run backend:cloudsql
```

This checks that `CLOUD_SQL_INSTANCE`, `CLOUD_SQL_USER`, and `CLOUD_SQL_PASSWORD` are set, then runs the API the same way as `./run.sh` but makes the intent explicit.

**Note:** Do not set `DATABASE_URL` to SQLite in `.env` if you want Postgres — either remove `DATABASE_URL` or rely on Cloud SQL: when the three `CLOUD_SQL_*` values above are present, [`app/config.py`](app/config.py) overrides `DATABASE_URL` to the Postgres URL.

## Connection details (reference)

- **Instance connection name**: `YOUR_PROJECT_ID:YOUR_REGION:altitudedb1` (instance ID **`altitudedb1`** is the Postgres instance name in GCP).
- **Database**: create `altitude` in Cloud SQL if needed, and set `CLOUD_SQL_DATABASE=altitude`.
- **Credentials**: only in `.env` or your secret manager — never commit them.

## Quick Setup (interactive template)

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

## Alternative: local Postgres in Docker (not Cloud SQL)

For offline development without GCP, you can use [`docker-compose.yml`](../docker-compose.yml) and [`run_postgres_local.sh`](run_postgres_local.sh) — see that script and `pnpm run backend:postgres`. That path uses `DATABASE_URL` and clears `CLOUD_SQL_*` so the app does not use Cloud SQL.

## Additional Resources

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs/postgres)
- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [SQLAlchemy AsyncPG Documentation](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html#asyncpg)

