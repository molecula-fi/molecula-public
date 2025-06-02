#!/bin/bash

if [ "$(uname | tr '[:upper:]' '[:lower:]' | grep -o 'linux')" ] ; then
  echo "Set shell option 'set -e'"
  # Exit immediately if a command exits with a non-zero status
  set -e
fi

NO_GENERATE=false
IS_WEBSITE=false
IS_BLOCKCHAIN=false

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

if git diff-tree --no-commit-id --name-only -r HEAD | grep -q '^blockchain/'; then
  IS_BLOCKCHAIN=true
fi

 if [[ "${IS_BLOCKCHAIN}" == true ]]; then
    echo "Installing lintspec..."
    # https://github.com/beeb/lintspec
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    . "$HOME/.cargo/env"  # Make `cargo` available
    cargo install lintspec
  
    echo "🔍 Running solidity code quality checks..."
    yarn turbo run lintspec:check --filter=@molecula-monorepo/solidity \
      docs:generate --filter=@molecula-monorepo/solidity \
      solhint:check --filter=@molecula-monorepo/solidity || { echo "❌ Code quality checks failed"; exit 1; }
      # Temporary disable the following until the issues with "429 Too Many Requests" is resolved:
      # test --filter=@molecula-monorepo/solidity --filter=@molecula-monorepo/blockchain.ethena

    # Run slither first and do it separately because slither cleans compiled artifacts
    if command -v slither >/dev/null 2>&1; then
      echo "🔍 Running slither check..."
      yarn turbo run slither --affected || { echo "❌ pre-merge slither failed"; exit 1; }
    else
      echo "ℹ️ Slither not found, skipping Solidity static analysis"
    fi
 fi

if git diff-tree --no-commit-id --name-only -r HEAD | grep -q '^frontend/website/'; then
  IS_WEBSITE=true
fi

# [Re-]generate all required types in parallel first.
if [[ "${NO_GENERATE}" == false ]]; then
  if [[ "${IS_WEBSITE}" == true ]]; then
    echo "🔍 Running code generation for website..."
    yarn turbo run gql:generate || { echo "❌ Code generation failed"; exit 1; }
  else
    echo "🔍 Running code generation..."
    yarn turbo run compile gql:generate || { echo "❌ Code generation failed"; exit 1; }
  fi
fi

# Then run the required checks in parallel
echo "🔍 Running general code quality checks..."
yarn turbo run tsc \
  eslint:check \
  prettier:check \
  cycles:check \
  unitTests || { echo "❌ Code quality checks failed"; exit 1; }


if [[ "${IS_BLOCKCHAIN}" == true && -n "${CI_MERGE_REQUEST_SOURCE_BRANCH_NAME}" ]]; then
  echo "🔍 Running forge tests..."

  git config --global --add safe.directory /builds/datsteam/molecula/molecula-monorepo
  git config --global --add safe.directory /builds/datsteam/molecula/molecula-monorepo/blockchain/solidity/lib/forge-std

  cd /builds/datsteam/molecula/molecula-monorepo/blockchain/solidity
  forge install
  forge build
  forge test
fi
