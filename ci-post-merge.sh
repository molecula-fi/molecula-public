#!/bin/bash

if [ "$(uname | tr '[:upper:]' '[:lower:]' | grep -o 'linux')" ] ; then
  echo "Set shell option 'set -e'"
  # Exit immediately if a command exits with a non-zero status
  set -e
fi

turbo() {
  echo "🚀 Running turbo with merge environment file (write to remote cache)"
  yarn turbo:merge "$@" --filter=[HEAD^1]
}

IS_BLOCKCHAIN=false

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
  turbo run lintspec:check --filter=@molecula-monorepo/solidity \
    docs:generate --filter=@molecula-monorepo/solidity \
    solhint:check --filter=@molecula-monorepo/solidity || { echo "❌ Code quality checks failed"; exit 1; }
    # Temporary disable the following until the issues with "429 Too Many Requests" is resolved:
    # test --filter=@molecula-monorepo/solidity --filter=@molecula-monorepo/blockchain.ethena

  # Run slither first and do it separately because slither cleans compiled artifacts
  if command -v slither >/dev/null 2>&1; then
    echo "🔍 Running slither check..."
    turbo run slither --affected || { echo "❌ pre-merge slither failed"; exit 1; }
  else
    echo "ℹ️ Slither not found, skipping Solidity static analysis"
  fi
 fi


# Then run the required checks in parallel
echo "🔍 Running general code quality checks..."
turbo run compile \
  gql:generate \
  tsc \
  eslint:check \
  prettier:check \
  cycles:check \
  unitTests || { echo "❌ Code quality checks failed"; exit 1; }
