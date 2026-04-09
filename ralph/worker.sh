#!/bin/bash
set -eo pipefail

# This script runs a single iteration of the Ralph loop using Copilot CLI.
# Usage: ./worker.sh <parent_issue_number>

# 1. Validate parent issue argument
if [ -z "$1" ]; then
  echo "Error: Parent issue number required"
  echo "Usage: $0 <parent_issue_number>"
  exit 1
fi

PARENT_ISSUE=$1

# 2. Navigate to the root of the repository
# Store current directory to resolve prompt.md
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# 3. Fetch child issues of the parent issue using GitHub's parent-child linking
echo "Fetching child issues of parent issue #$PARENT_ISSUE..."
# Query issues that are linked as children to the parent
CHILD_ISSUES=$(gh issue list --state open --search "linked:$PARENT_ISSUE" --json number,title,body,comments --limit 50 2>/dev/null || echo "[]")

if [ "$CHILD_ISSUES" = "[]" ]; then
  echo "No child issues found. Fetching all open issues as fallback..."
  CHILD_ISSUES=$(gh issue list --state open --json number,title,body,comments --limit 50 || echo "[]")
fi

ISSUES="$CHILD_ISSUES"

# 4. Fetch recent RALPH commits to provide context on previous work
echo "Fetching recent commits..."
RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

# 5. Prepare the context for Copilot
CONTEXT="# PARENT ISSUE
#$PARENT_ISSUE

# CHILD ISSUES (JSON)
${ISSUES}

# RECENT RALPH COMMITS
${RALPH_COMMITS}

$(cat "$SCRIPT_DIR/prompt.md")"

# 6. Call the Copilot CLI
echo "Invoking Copilot..."
echo "$CONTEXT" | copilot -y -p "You are in an autonomous development loop working on child issues of PR #$PARENT_ISSUE. Ensure you work at the project root. Review the issues and commits to pick and complete the next child issue. Create a branch, implement, test, commit with RALPH prefix, push branch, create PR, and close the issue. Follow all instructions in the provided context."

echo "Iteration finished."
