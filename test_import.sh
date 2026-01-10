#!/bin/bash
# Test violation import API

echo "Testing violation import API..."
echo "File: recalls.json (3.4MB)"
echo ""

response=$(curl -s -X POST http://localhost:8000/api/imports/violations/file \
  -F "file=@recalls.json" \
  -F "file_type=json" \
  -F "auto_classify_risk=true" \
  -F "auto_investigate=false" \
  -F "organization_name=Test Organization")

echo "Response:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# Extract import_id if successful
import_id=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('import_id', ''))" 2>/dev/null)

if [ -n "$import_id" ]; then
    echo "✓ Import started with ID: $import_id"
    echo ""
    echo "Check progress at: http://localhost:8000/api/imports/history/$import_id"
    echo "Or check the backend console for detailed logs"
else
    echo "✗ Import failed to start"
fi



