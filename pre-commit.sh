#!/bin/bash

# Exit immediately if any command fails
set -eo pipefail

# Source the turbo utilities file
source ./scripts/turbo_utils.sh

FULL_CHECK=false

# Check if --full is passed as an argument
for arg in "$@"; do
	if [ "$arg" == "--full" ]; then
		FULL_CHECK=true
		break
	fi
done

# [Re-]generate all required types in parallel first.
# npx concurrently "yarn compile:all" "yarn gql:generate"
# yarn turbo run compile gql:generate
echo "🔍 Running pre-commit code generation..."
turbo run compile gql:generate --affected || { echo "❌ pre-commit code generation failed"; exit 1; }

# Run slither first and do it separately because slither cleans compiled artifacts
echo "🔍 Running pre-commit slither check..."
if command -v slither >/dev/null 2>&1; then
  turbo run slither --affected || { echo "❌ pre-commit slither failed"; exit 1; }
else
  echo "ℹ️ Slither not found, skipping Solidity static analysis"
fi

# Run the required checks
echo "🔍 Running code quality checks..."
if [ "$FULL_CHECK" == true ]; then
	turbo run tsc \
    eslint:check \
    prettier:check \
    cycles:check \
    solhint:check --filter=@molecula-monorepo/solidity \
    lintspec:check --filter=@molecula-monorepo/solidity \
    test --filter=@molecula-monorepo/solidity --filter=@molecula-monorepo/blockchain.ethena \
    unitTests || { echo "❌ pre-commit --full code quality checks failed"; exit 1; }
else
	turbo run tsc \
    eslint:check \
    prettier:check \
    cycles:check \
    --affected \
    || { echo "❌ pre-commit code quality checks failed"; exit 1; }
fi
