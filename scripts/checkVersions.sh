#!/usr/bin/env bash

# This script verifies that Node.js and Yarn versions match exactly the ones specified in package.json.
#
# If any version does not match, an error message is printed and the script exits with status 1.

# Exit immediately if any command in a pipeline fails (unless its exit code is caught).
set -e

# Function to print an error message to stderr and exit with code 1.
# ARGUMENTS:
#   $1 - the error message to display.
error_exit() {
  echo "ERROR: $1" >&2
  exit 1
}

# ----------------------------
# Extract required versions from package.json
# ----------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGE_JSON="$ROOT_DIR/package.json"

# Check if package.json exists
if [[ ! -f "$PACKAGE_JSON" ]]; then
  error_exit "❌ package.json not found at $PACKAGE_JSON"
fi

# Extract the node and yarn versions directly using the "engines" section from package.json
# Node.js version
REQUIRED_NODE_VERSION=$(node -e "console.log(require('$PACKAGE_JSON').engines.node)")
if [[ -z "$REQUIRED_NODE_VERSION" ]]; then
  error_exit "❌ Could not extract Node.js version from package.json"
fi

# Yarn version
REQUIRED_YARN_VERSION=$(node -e "console.log(require('$PACKAGE_JSON').engines.yarn)")
if [[ -z "$REQUIRED_YARN_VERSION" ]]; then
  error_exit "❌ Could not extract Yarn version from package.json"
fi

# ----------------------------
# Check Node.js version:
# ----------------------------

# Get the installed Node.js version, e.g. "v22.16.0"
INSTALLED_NODE_VERSION="$(node -v 2>/dev/null || echo \"\")"
# Remove the 'v' prefix for comparison
INSTALLED_NODE_VERSION_CLEAN="${INSTALLED_NODE_VERSION#v}"

# If node is not installed or version does not exactly match REQUIRED_NODE_VERSION, exit with error.
if [[ "$INSTALLED_NODE_VERSION_CLEAN" != "$REQUIRED_NODE_VERSION" ]]; then
  error_exit "❌ Expected Node.js version ${REQUIRED_NODE_VERSION}, but found \"${INSTALLED_NODE_VERSION:-not installed}\"."
fi

# ----------------------------
# Check Yarn version:
# ----------------------------

# Get the installed Yarn version, e.g. "1.22.22"
INSTALLED_YARN_VERSION="$(yarn --version 2>/dev/null || echo \"\")"

# If yarn is not installed or version does not exactly match REQUIRED_YARN_VERSION, exit with error.
if [[ "$INSTALLED_YARN_VERSION" != "$REQUIRED_YARN_VERSION" ]]; then
  error_exit "❌ Expected Yarn version ${REQUIRED_YARN_VERSION}, but found \"${INSTALLED_YARN_VERSION:-not installed}\"."
fi

# If both checks pass, print a success message.
echo "✅ Versions are correct"
exit 0
