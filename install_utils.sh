#!/bin/bash

# Exit immediately if any command fails
set -eo pipefail

function install_or_update_slither() {
  # https://github.com/crytic/slither
  echo "Try installing slither via python3 pip... "
  if ! command python3 -m pip install --upgrade slither-analyzer; then
    echo "Try upgrading slither via pipx... "
    if ! command pipx upgrade slither-analyzer; then
      echo "Try installing slither via pipx... "
      pipx install slither-analyzer
    fi
  fi
}

function install_lintspec() {
  # install cargo if it's not installed
  if ! command -v cargo >/dev/null 2>&1; then
    echo "Installing cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"  # Make `cargo` available
  fi

  echo "Installing lintspec..."
  # https://github.com/beeb/lintspec
  cargo install lintspec
}