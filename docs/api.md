---
layout: default
title: API Documentation
description: Complete API documentation for Altitude - REST API, MCP integration, Python SDK, and developer resources.
permalink: /api.html
---

# Altitude API Documentation

Complete developer documentation for integrating with Altitude's API and building custom solutions.

## Interactive API Documentation

For live, interactive API documentation with request/response examples, visit:

**[Interactive API Docs](http://localhost:8000/docs)** (requires local server running)

The interactive documentation provides:
- Complete endpoint reference
- Request/response schemas
- Try-it-out functionality
- Authentication examples
- Code samples in multiple languages

## API Overview

Altitude provides a comprehensive RESTful API for programmatic access to all platform features:

- **Base URL:** `http://localhost:8000/api`
- **Documentation:** `http://localhost:8000/docs`
- **Authentication:** API key or token-based
- **Format:** JSON request/response bodies
- **Version:** v1 (current)

## Quick Start

### Authentication

Most API endpoints require authentication. Include your API key in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8000/api/banned-products
```

### Example: Create a Banned Product

```bash
curl -X POST "http://localhost:8000/api/banned-products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Product Name",
    "manufacturer": "Manufacturer Name",
    "reason": "Safety hazard",
    "risk_level": "HIGH"
  }'
```

### Example: Create an Investigation

```bash
curl -X POST "http://localhost:8000/api/investigations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "banned_product_id": 1,
    "schedule": "DAILY",
    "marketplaces": ["ebay", "amazon"]
  }'
```

## Python SDK

Install the Altitude Python SDK:

```bash
pip install altitude-sdk
```

Example usage:

```python
from altitude import AltitudeClient

client = AltitudeClient(api_key="your-api-key")

# Create a banned product
banned_product = client.banned_products.create(
    name="Product Name",
    manufacturer="Manufacturer Name",
    reason="Safety hazard",
    risk_level="HIGH"
)

# Search marketplaces
results = client.investigations.search(
    banned_product_id=banned_product.id,
    marketplaces=["ebay", "amazon", "facebook"]
)

# Get risk classification
risk = client.banned_products.get_risk_classification(banned_product.id)
print(f"Risk Level: {risk.level}")
```

## MCP Integration

Altitude includes a Model Context Protocol (MCP) server for AI agent integration:

- Works with Claude Desktop and other compatible AI systems
- 11+ MCP tools available for banned product search and monitoring
- Skills power the tools for intelligent automation

### MCP Tools Available

- `search_banned_products` - Search banned product database
- `create_investigation` - Create scheduled investigation
- `get_investigation_results` - Retrieve investigation results
- `classify_risk` - Classify banned product risk level
- `search_marketplace` - Search specific marketplace
- And more...

For MCP setup instructions, see the [User Guide]({{ '/userguide.html' | relative_url }}#mcp-integration).

## Webhooks

Configure webhooks to receive real-time notifications:

```bash
curl -X POST "http://localhost:8000/api/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["investigation.completed", "listing.found"]
  }'
```

## API Endpoints

### Banned Products

- `GET /api/banned-products` - List all banned products
- `POST /api/banned-products` - Create banned product
- `GET /api/banned-products/{id}` - Get banned product details
- `PUT /api/banned-products/{id}` - Update banned product
- `DELETE /api/banned-products/{id}` - Delete banned product
- `POST /api/banned-products/import` - Bulk import from CSV/JSON

### Investigations

- `GET /api/investigations` - List all investigations
- `POST /api/investigations` - Create investigation
- `GET /api/investigations/{id}` - Get investigation details
- `PUT /api/investigations/{id}` - Update investigation
- `DELETE /api/investigations/{id}` - Cancel investigation
- `POST /api/investigations/{id}/run` - Run investigation immediately

### Listings

- `GET /api/listings` - List all listings
- `GET /api/listings/{id}` - Get listing details
- `POST /api/listings` - Add listing manually
- `PUT /api/listings/{id}` - Update listing
- `DELETE /api/listings/{id}` - Delete listing
- `GET /api/listings/flagged` - Get flagged listings for review

### Marketplaces

- `GET /api/marketplaces` - List all marketplaces
- `PUT /api/marketplaces/{id}` - Update marketplace configuration

### Reports

- `GET /api/reports` - List available reports
- `POST /api/reports/generate` - Generate custom report
- `GET /api/reports/{id}/download` - Download report

For complete endpoint documentation, see the [Interactive API Docs](http://localhost:8000/docs).

## Rate Limits

API rate limits ensure fair usage:

- **Standard tier:** 100 requests per minute
- **Enterprise tier:** Custom limits available
- Rate limit headers included in all responses

## Error Handling

API errors follow standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

Error responses include detailed error messages:

```json
{
  "error": "Validation Error",
  "message": "Invalid risk_level value",
  "details": {
    "field": "risk_level",
    "allowed_values": ["HIGH", "MEDIUM", "LOW"]
  }
}
```

## CLI Tools

Altitude provides command-line tools for automation:

```bash
# Install CLI
pip install altitude-cli

# Configure
altitude configure --api-key YOUR_API_KEY

# Import banned products
altitude import banned-products data.csv

# Run investigation
altitude investigations run --id 123

# Export results
altitude export listings --format csv --output results.csv
```

## Integration Examples

### Batch Import Script

```python
import csv
from altitude import AltitudeClient

client = AltitudeClient(api_key="your-api-key")

with open('banned_products.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        client.banned_products.create(**row)
```

### Automated Report Generation

```python
from altitude import AltitudeClient
import schedule
import time

client = AltitudeClient(api_key="your-api-key")

def generate_daily_report():
    report = client.reports.generate(
        type="daily_summary",
        format="pdf"
    )
    # Send report via email or save to disk
    print(f"Report generated: {report.id}")

schedule.every().day.at("09:00").do(generate_daily_report)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Support

For API support, documentation issues, or feature requests:

- [GitHub Issues](https://github.com/bizoton19/altitude/issues)
- [Contact Us]({{ '/contact.html' | relative_url }})
- [Interactive API Docs](http://localhost:8000/docs)

