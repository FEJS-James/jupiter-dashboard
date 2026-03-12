#!/bin/bash

# Test authentication on analytics endpoints
BASE_URL="http://localhost:3000"

ENDPOINTS=(
  "/api/analytics/overview"
  "/api/analytics/velocity"
  "/api/analytics/completion"
  "/api/analytics/agents"
  "/api/analytics/projects"
  "/api/analytics/additional"
)

echo "🚀 Testing analytics endpoints authentication..."
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
  echo "🔍 Testing $endpoint..."
  
  # Test without authentication (should return 401)
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
  
  if [ "$status_code" == "401" ]; then
    echo "   ✅ Authentication required (401 Unauthorized)"
  elif [ "$status_code" == "000" ]; then
    echo "   ❓ Server not responding (is it running?)"
  else
    echo "   ❌ Authentication NOT required (got $status_code)"
    echo "   This is a SECURITY ISSUE!"
  fi
  
  echo ""
done

echo "✨ Authentication test completed!"