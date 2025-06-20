#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

IS_TEST_MODE=false

# Display usage information and exit
# Arguments:
#   None
# Outputs:
#   Writes usage message to stderr
display_usage() { 
    echo "Usage: $0 [-p (optional) Package <front|back|website|retail>] [-s Stand <dev|alpha|beta|prod>]" 1>&2
    exit 1 
}

# Git tag format explanation:
# Format: 1.0.0-<increment>-<package>-<environment> or 1.0.0-<increment>-<environment> if package is not specified
# Example: 1.0.0-42-front-dev or 1.0.0-42-dev

# Get environments for a package
# Arguments:
#   $1 - package_name: The package to get environments for
# Outputs:
#   Writes space-separated list of environments to stdout
_get_envs_for_package() {
    local pkg_name="$1"
    if [[ -z "$pkg_name" ]]; then
        pkg_name="_global"
    fi

    case "$pkg_name" in
        "front")
            echo "dev alpha beta prod"
            ;;
        "back")
            echo "dev alpha beta prod"
            ;;
        "website")
            echo "dev beta prod"
            ;;
        "retail")
            echo "dev beta prod"
            ;;
        "_global")
            echo "dev alpha beta prod"
            ;;
        *)
            echo "" # unknown package
            ;;
    esac
}

# Create a new git tag for deployment
# Arguments:
#   $1 - package_name: The package to tag (front, back, website, retail) or empty string
#   $2 - environment_name: The environment to tag for (dev, alpha, beta, prod)
# Outputs:
#   Writes tag information to stdout
create_deployment_tag() {
    local package_name="$1"
    local environment_name="$2"
    
    local tag_pattern
    local tag_suffix

    echo "🔍 Fetching latest tags from remote repository ..." 1>&2
    # Before creating a new deployment tag, fetch the latest tags from the remote repository
    git fetch --tags
    echo "✅ Fetched successfully" 1>&2
    
    if [[ -z "$package_name" ]]; then
        # No package specified, use format: 1.0.0-<increment>-<environment>
        tag_pattern="^1\.0\.0-[0-9]+-$environment_name$"
        tag_suffix="-$environment_name"
    else
        # Package specified, use format: 1.0.0-<increment>-<package>-<environment>
        tag_pattern="^1\.0\.0-[0-9]+-$package_name-$environment_name$"
        tag_suffix="-$package_name-$environment_name"
    fi
    
    # Find the latest tag matching our pattern
    local latest_tag
    latest_tag=$(git tag -l --sort=v:refname | grep -E "$tag_pattern" | tail -n 1)
    echo "  - Latest tag: '$latest_tag'"
    
    local new_tag
    if [[ -z "$latest_tag" ]]; then
        # No existing tag found, start with build number 1
        new_tag="1.0.0-1$tag_suffix"
    else
        # Extract the build number from the latest tag and increment it
        local build_number
        # Try both GNU and BSD sed variants
        build_number=$(echo "$latest_tag" | sed -E "s/^1\.0\.0-([0-9]+)-.*/\1/" 2>/dev/null || 
                      echo "$latest_tag" | sed -r "s/^1\.0\.0-([0-9]+)-.*/\1/")
        
        echo "  - Previous build number: $build_number"
        build_number=$((build_number + 1))
        echo "  - New build number: $build_number"
        
        new_tag="1.0.0-$build_number$tag_suffix"
    fi
    
    echo "  - New tag: '$new_tag'"
    
    if [[ "$IS_TEST_MODE" = true ]]; then
        echo "  [TEST MODE] Would create git tag: $new_tag"
    else
        git tag "$new_tag"
    fi
    
    echo
}

# List available environments for a package
# Arguments:
#   $1 - package_name: The package to get environments for
# Outputs:
#   Writes comma-separated list of environments to stdout
get_available_environments() {
    local package_name="$1"
    local envs
    envs=$(_get_envs_for_package "$package_name")

    if [[ -n "$envs" ]]; then
        echo "$envs" | tr ' ' ', '
    else
        echo "unknown"
    fi
}

# Validate if environment is available for the package
# Arguments:
#   $1 - package_name: The package to check
#   $2 - environment_name: The environment to validate
# Returns:
#   0 if environment is valid for package, 1 otherwise
is_valid_environment_for_package() {
    local package_name="$1"
    local environment_name="$2"
    local envs
    envs=$(_get_envs_for_package "$package_name")

    if [[ -n "$envs" ]]; then
        for env in $envs; do
            if [[ "$env" == "$environment_name" ]]; then
                return 0
            fi
        done
    fi
    return 1
}

# Initialize variables
package_name=""
environment_name=""

# Parse command line arguments
while getopts ":p:s:" option; do
    case "${option}" in
        p)
            package_name="${OPTARG}"
            # Validate package name
            if [[ "$package_name" != "front" ]] && [[ "$package_name" != "back" ]] && 
               [[ "$package_name" != "website" ]] && [[ "$package_name" != "retail" ]]; then
                display_usage
            fi
            ;;
        s)
            environment_name="${OPTARG}"
            # Basic environment name validation
            if [[ "$environment_name" != "dev" ]] && [[ "$environment_name" != "alpha" ]] && 
               [[ "$environment_name" != "beta" ]] && [[ "$environment_name" != "prod" ]]; then
                display_usage
            fi
            ;;
        *)
            display_usage
            ;;
    esac
done
shift $((OPTIND-1))

# Ensure environment is provided
if [[ -z "$environment_name" ]]; then
    display_usage
fi

# Validate if the selected environment is available for the package
if ! is_valid_environment_for_package "$package_name" "$environment_name"; then
    echo "Error: Environment '$environment_name' is not available for package '$package_name'" 1>&2
    echo "Available environments for '$package_name': $(get_available_environments "$package_name")" 1>&2
    exit 1
fi

if [[ -z "$package_name" ]]; then
    echo "Creating new deployment tag for all packages in $environment_name environment"
else
    echo "Creating new deployment tag for $package_name in $environment_name environment"
fi

create_deployment_tag "$package_name" "$environment_name"

echo "Push changes to gitlab ..."
if [[ "$IS_TEST_MODE" = true ]]; then
    echo "[TEST MODE] Would push tags to remote repository"
else
    git push --tags
fi