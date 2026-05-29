#!/bin/bash
set -e

echo "Running Schema Guard..."

# Get absolute path of this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking database schema sync..."
if python "$SCRIPT_DIR/schema-guard.py"; then
    echo "Database schema is fully in sync for target components!"
    exit 0
else
    echo "Schema mismatch or validation errors detected!"
    exit 1
fi
