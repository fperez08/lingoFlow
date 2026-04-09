#!/bin/bash
set -eo pipefail

# This script runs a single iteration of the Ralph loop using Gemini CLI.

# 1. Fetch open GitHub issues with their bodies and comments
echo "Fetching GitHub issues..."
ISSUES=$(gh issue list --state open --json number,title,body,comments --limit 50 || echo "[]")

# 2. Fetch recent RALPH commits to provide context on previous work
echo "Fetching recent commits..."
RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

# 3. Prepare the context for Gemini
CONTEXT="# OPEN ISSUES (JSON)
${ISSUES}

# RECENT RALPH COMMITS
${RALPH_COMMITS}

$(cat prompt.md)"

# 4. Call the Gemini CLI
echo "Invoking Gemini..."
echo "$CONTEXT" | gemini -y -p "You are in an autonomous development loop. Review the issues and commits to pick and complete the next task. Follow all instructions in the provided context."

echo "Iteration finished."
