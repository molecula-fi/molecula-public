#!/bin/bash

# Exit immediately if any command fails
set -eo pipefail

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
yarn turbo run compile gql:generate --cache=local:rw --output-logs=new-only

# Run slither first and do it separately because slither cleans compiled artifacts
if slither --version "$1"; then
  yarn turbo run slither || { echo "slither failed"; exit 1; }
fi

# Run the required checks
if [ "$FULL_CHECK" == true ]; then
	yarn turbo\
    tsc\
    eslint:check\
    prettier:check\
    cycles:check\
    solhint:check\
    hardhatUnitTests\
    unitTests --output-logs=new-only || { echo "pre-commit --full failed"; exit 1; }

  # Run natspec check without turbo since it's present only in a root package
  # Temporary disable
  # yarn natspec:check || { echo "natspec check failed"; exit 1; }
else
	yarn turbo tsc eslint:check prettier:check --output-logs=new-only || { echo "pre-commit failed"; exit 1; }
fi
