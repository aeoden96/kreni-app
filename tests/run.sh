#!/bin/bash
# Test runner for ZET Zagreb transit app

set -e

echo "🧪 Running functional requirements tests..."
echo ""

python3 tests/test_functional_requirements.py

echo ""
echo "✅ All tests completed successfully!"
