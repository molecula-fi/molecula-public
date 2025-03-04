#!/bin/bash

if [ "$(uname | tr '[:upper:]' '[:lower:]' | grep -o 'linux')" ] ; then
  echo "Set shell option 'set -e'"
  set -e
fi

NO_GENERATE=false

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

# [Re-]generate all required types in parallel first.
if [[ "${NO_GENERATE}" == false ]]; then
  npx concurrently "yarn compile:all" "yarn gql:generate"
  # yarn turbo run compile gql:generate
fi

# Run slither first and do it separately because slither cleans compiled artifacts
if slither --version "$1"; then
  yarn slither || { echo "slither failed"; exit 1; }
fi
# yarn turbo run slither

# Then run the required checks in parallel as well.
npx concurrently "yarn tsc" \
 "yarn eslint:check" \
 "yarn prettier:check" \
 "yarn cycles:check" \
 "yarn solhint:check" \
 "yarn natspec:check" \
 "yarn unitTests" \
# Temporary disable the following until the issues with "429 Too Many Requests" is resolved:
# "yarn hardhatUnitTests"

# Note: uncomment to use "jobrun" script to also parallel the shared checks between workspaces.
# npx concurrently "yarn jobrun tsc" "yarn jobrun eslint:check" "yarn jobrun prettier:check" "yarn cycles:check" "yarn solhint:check" "yarn natspec:check" "yarn unitTests"
