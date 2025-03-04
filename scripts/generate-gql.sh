#!/bin/bash

echo 'GQL generation is not supported in public repository';

# npx concurrently \
#   "yarn workspace @molecula-monorepo/frontend.prelaunch gql:generate" \
#   "yarn workspace @molecula-monorepo/frontend.retail gql:generate" \
#   "yarn workspace @molecula-monorepo/frontend.website gql:generate" \
#   "yarn workspace @molecula-monorepo/middleware.deposit-solutions gql:generate" \
#   "yarn workspace @molecula-monorepo/backend.graphql gql:generate" \
#   "yarn workspace @molecula-monorepo/middleware.atoms-manager gql:generate" \
#   "yarn workspace @molecula-monorepo/middleware.info-viewer gql:generate" \
#   "yarn workspace @molecula-monorepo/middleware.operations-viewer gql:generate" \
#   "yarn workspace @molecula-monorepo/middleware.pool-manager gql:generate"