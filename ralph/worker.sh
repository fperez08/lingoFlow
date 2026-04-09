#!/bin/bash
set -eo pipefail

# This script runs a single iteration of the Ralph loop using Copilot CLI.
# Usage: ./worker.sh

# 1. Navigate to the root of the repository
# Store current directory to resolve prompt.md
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# 2. Fetch all open GitHub issues
echo "Fetching open GitHub issues..."
ISSUES=$(gh issue list --state open --json number,title,body,comments --limit 100 || echo "[]")

# 3. Fetch recent RALPH commits to provide context on previous work
echo "Fetching recent commits..."
RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

# 4. Prepare the context for Copilot
CONTEXT="# OPEN ISSUES (JSON)
${ISSUES}

# RECENT RALPH COMMITS
${RALPH_COMMITS}

$(cat "$SCRIPT_DIR/prompt.md")"

# 6. Call the Copilot CLI
COPILOT_MODEL="${COPILOT_MODEL:-grok-code-fast-1}"
echo "Invoking Copilot with model: $COPILOT_MODEL"
echo "$CONTEXT" | copilot --model "$COPILOT_MODEL" --yolo -p "You are in an autonomous development loop. Ensure you work at the project root. Review all open issues and recent commits, pick the next best single issue, then implement it. Create a branch, implement, test, commit with RALPH prefix, push branch, create PR, and close the issue when completed. Follow all instructions in the provided context."

echo "Iteration finished."
