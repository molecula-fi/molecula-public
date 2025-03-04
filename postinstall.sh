#!/bin/bash

# Apply predefined patches defined in `patches/*.patch` files
npx patch-package

# Generate types for contracts
yarn workspace @molecula-monorepo/common.evm-contracts types:generate
yarn workspace @molecula-monorepo/common.tron-contracts types:generate

# Notify the user about the need to decrypt secrets
if [ -x "$(command -v osascript)" ]
then
  osascript -e "display notification \"Installed! Now decrypt secrets and generate GQL types\" with title \"Molecula-monorepo\""
fi
