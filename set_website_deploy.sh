#!/usr/bin/env bash
set -e

usage() { echo "Usage: $0 <beta|dev>" 1>&2; exit 1; }
createLocalTags() { # first arg is stand, the second one is component
    ss="$1"
    echo "- Processing stand '$ss' ..."
    last_tag=$(git tag -l --sort=v:refname | grep -E "^molecula-[0-9]+\.[0-9]+\.[0-9]+-website-k8s-$ss$" | tail -n 1)
    echo "  - Last tag: '$last_tag'"
    if [[ -z "$last_tag" ]] ; then
        new_tag="molecula-0.1.0-website-k8s-$ss"
    else
        # Use sed in a cross-platform way to get the build number (major.minor.patch)
        build_number=$(echo "$last_tag" | sed -E "s/^molecula-([0-9]+\.[0-9]+\.[0-9]+)-website-k8s-.*/\1/" 2>/dev/null || echo "$last_tag" | sed -r "s/^molecula-([0-9]+\.[0-9]+\.[0-9]+)-website-k8s-.*/\1/")
        echo "  - Last build number: $build_number"
         # Increment the last part of the version (patch number)
        major=$(echo "$build_number" | cut -d. -f1)
        minor=$(echo "$build_number" | cut -d. -f2)
        patch=$(echo "$build_number" | cut -d. -f3)
        patch=$((patch + 1))
        build_number="$major.$minor.$patch"
        echo "  - New build number: $build_number"
        new_tag="molecula-$build_number-website-k8s-$ss"
    fi
    echo "  - New tag: '$new_tag'"
    git tag "$new_tag"
    echo
}

stand="$1"

if [[ -z "${stand}" ]] || { [[ "$stand" != 'beta' ]] && [[ "$stand" != 'dev' ]]; }; then
    usage
fi

echo "Creating new tag for stand: '${stand}'"
echo

current_commit="$(git rev-parse HEAD)"
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "- Current commit: $current_commit"
echo "- Current branch: $current_branch"
echo

echo "- Fetching tags..."
git fetch --tags -f &> /dev/null
echo

echo "- Creating git tag on branch '${current_branch}' ($current_commit)..."
createLocalTags "$stand"

echo "- Push changes to gitlab ..."
git push --tags
