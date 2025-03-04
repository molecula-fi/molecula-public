#!/bin/bash

# Check if a command is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <command>"
    exit 1
fi

# Define workspace groups
workspace_groups=(
    "backend"
    "frontend"
    "middleware"
    "common"
    "contracts"
    "configs"
    "tests"
    "ui-tests"
)

# Function to get workspace names and locations
get_workspace_info() {
    yarn workspaces info | node -e "
    const input = require('fs').readFileSync(0, 'utf-8');
    const jsonStartIndex = input.indexOf('{');
    const jsonEndIndex = input.lastIndexOf('}') + 1;
    const json = input.substring(jsonStartIndex, jsonEndIndex);
    const workspaces = JSON.parse(json);
    for (const [name, info] of Object.entries(workspaces)) {
        console.log(name + ' ' + info.location);
    }
    "
}

# Loop through each group and run the provided command concurrently
for group in "${workspace_groups[@]}"; do
    echo "Running command for workspaces in group: $group"
    commands=()
    while IFS= read -r line; do
        workspace_name=$(echo $line | awk '{print $1}')
        workspace_location=$(echo $line | awk '{print $2}')
        if [[ $workspace_location == $group* ]]; then
            commands+=("\"yarn workspace $workspace_name run $1\"")
        fi
    done < <(get_workspace_info)
    
    # Run commands in batches of 10
    if [ ${#commands[@]} -gt 0 ]; then
        for ((i=0; i<${#commands[@]}; i+=10)); do
            batch=("${commands[@]:i:10}")
            npx concurrently "${batch[@]}"
            wait
        done
    fi
done