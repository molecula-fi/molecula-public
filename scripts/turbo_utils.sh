#!/bin/bash

IS_CI_MAIN_BRANCH=false
if [ "$CI_COMMIT_BRANCH" = "main" ]; then
  IS_CI_MAIN_BRANCH=true
fi

turbo() {
  if [ "$IS_CI_MAIN_BRANCH" = true ]; then
    # Run turbo with the merge environment file (reads and writes to the remote cache) on the main branch in CI
    echo "🚀 Running turbo with merge environment file (write to remote cache)"
    yarn turbo:merge "$@" --filter=[HEAD^1]
  else
    # Run turbo with the default environment file (only reads from the remote cache)
    echo "🚀 Running turbo (read only from remote cache)"
    yarn turbo "$@"
  fi
}