#!/bin/bash

if [ "$(uname | tr '[:upper:]' '[:lower:]' | grep -o 'linux')" ] ; then
  echo "Set shell option 'set -e'"
  # Exit immediately if a command exits with a non-zero status
  set -e
fi

# Source the turbo utilities file
source ./scripts/turbo_utils.sh

NO_GENERATE=false
IS_WEBSITE=false

POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-generate)
      NO_GENERATE=true
      shift # past argument
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

if git diff-tree --no-commit-id --name-only -r HEAD | grep -q '^frontend/website/'; then
  IS_WEBSITE=true
fi

if git diff-tree --no-commit-id --name-only -r HEAD | grep -q '^blockchain/'; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  cargo install lintspec
fi

# [Re-]generate all required types in parallel first.
if [[ "${NO_GENERATE}" == false ]]; then
  if [[ "${IS_WEBSITE}" == true ]]; then
    echo "🔍 Running code generation for website..."
    turbo run gql:generate || { echo "❌ Code generation failed"; exit 1; }
  else
    echo "🔍 Running code generation..."
    turbo run compile gql:generate || { echo "❌ Code generation failed"; exit 1; }
  fi
fi

# Run slither first and do it separately because slither cleans compiled artifacts
if slither --version "$1"; then
  echo "🔍 Running slither check..."
  turbo run slither || { echo "❌ slither failed"; exit 1; }
fi

# Then run the required checks in parallel
echo "🔍 Running code quality checks..."
turbo run tsc \
  eslint:check \
  prettier:check \
  solhint:check \
  cycles:check \
  unitTests || { echo "❌ Code quality checks failed"; exit 1; }

  # Temporary disable
  # natspec:check

  # Temporary disable the following until the issues with "429 Too Many Requests" is resolved:
  # test --filter=@molecula-monorepo/blockchain.ethena --filter=@molecula-monorepo/solidity

git config --global --add safe.directory /builds/datsteam/molecula/molecula-monorepo
git config --global --add safe.directory /builds/datsteam/molecula/molecula-monorepo/blockchain/solidity/lib/forge-std

if [[ "${IS_WEBSITE}" == false && -n "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" ]]; then
  cd /builds/datsteam/molecula/molecula-monorepo/blockchain/solidity
  forge install
  forge build
  forge test
fi
