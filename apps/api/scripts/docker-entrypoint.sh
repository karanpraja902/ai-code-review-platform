#!/bin/sh
set -e

# Create credentials directory if it doesn't exist
mkdir -p /app/credentials

# Decode Google credentials from base64 if provided
if [ -n "$GOOGLE_CREDENTIALS_JSON_BASE64" ]; then
  echo "$GOOGLE_CREDENTIALS_JSON_BASE64" | base64 -d > /app/credentials/google-credentials.json
  chmod 600 /app/credentials/google-credentials.json
  echo "✅ Google credentials file created at /app/credentials/google-credentials.json"
  export GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-credentials.json
else
  echo "⚠️  GOOGLE_CREDENTIALS_JSON_BASE64 not set, skipping credentials file creation"
fi

# Execute the main command
exec "$@"

