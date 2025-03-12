#!/usr/bin/env bash
set -e

usage() { echo "Usage: $0 [-s Stand <dev|beta|alpha|prod>] [-c Component (do not specify for both) <front|back>] [-f Front part (front only <expo|admin>, do not specify for both)]" 1>&2; exit 1; }

createLocalTags() { # first arg is stand, the second one is component, the third one is front part
    ss="$1"
    cc="$2"
    ff="$3"
    # Format is molecula-MAJOR.MINOR.PATCH-BUILD_NUMBER-COMPONENT-STAND
    for c in $cc; do

        if [[ "$c" == 'front' ]] && [[ ! -z "$ff" ]] ; then
            f="-$ff"
        else
            f=""
        fi
        echo "- Processing stand '$ss', component '$c' ..."
        last_tag=$(git tag -l --sort=v:refname | grep -E "^molecula-$package_version-[0-9]+-$c-$ss$f$" | tail -n 1)
        echo "  - Last tag: '$last_tag'"
        if [[ -z "$last_tag" ]] ; then
            new_tag="molecula-$package_version-1-$c-$ss"
        else
            # Use sed in a cross-platform way
            build_number=$(echo "$last_tag" | sed -E "s/^molecula-$package_version-([0-9]+)-.*/\1/" 2>/dev/null || echo "$last_tag" | sed -r "s/^molecula-$package_version-([0-9]+)-.*/\1/")
            echo "  - Last build number: $build_number"
            build_number=$((build_number + 1))
            echo "  - New build number: $build_number"
            new_tag="molecula-$package_version-$build_number-$c-$ss$f"
        fi
        echo "  - New tag: '$new_tag'"
        git tag "$new_tag" 
        echo
    done
}

comp='both'
front=''
while getopts ":s:c:f:" o; do
    case "${o}" in
        s)
            stand="${OPTARG}"
            if [[ "$stand" != "dev" ]] && [[ "$stand" != "alpha" ]] && \
            [[ "$stand" != "beta" ]] && [[ "$stand" != "prod" ]] ; then
                usage
            fi
            ;;
        c)
            comp="${OPTARG}"
            if [[ "$comp" != "front" ]] && [[ "$comp" != "back" ]] ; then
                usage
            fi
            ;;
        f)
            front="${OPTARG}"
            if [[ "$front" != "expo" ]] && [[ "$front" != "admin" ]] ; then
                usage
            fi
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))

if [[ -z "${stand}" ]]; then
    usage
fi

echo "Creating new tag for"
echo "Component: '${comp//both/'front & back'}'"
echo "Stand: '${stand}'"
echo

# Ensure package.json is correctly parsed
package_version=$(jq -r '.version' "$(git rev-parse --show-toplevel)/package.json" 2>/dev/null || echo "unknown")
export package_version
if [[ -z "$(echo "$package_version" | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')" ]] ; then
    echo "Wrong package version format: '$package_version'"; exit 1;
fi
echo "- Root package version: $package_version"
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
createLocalTags "$stand" "${comp//both/back front}" "$front"

echo "- Push changes to gitlab ..."
git push --tags
