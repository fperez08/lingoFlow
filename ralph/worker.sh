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

# 5. Configure Copilot execution limits to avoid stuck iterations
ITERATION_TIMEOUT_SECONDS="${ITERATION_TIMEOUT_SECONDS:-2700}"

# 6. Call the Copilot CLI
COPILOT_MODEL="${COPILOT_MODEL:-claude-haiku-4.5}"
echo "Invoking Copilot with model: $COPILOT_MODEL"

PROMPT_TEXT="You are in an autonomous development loop. Ensure you work at the project root. Review all open issues and recent commits, pick the next best single issue, then implement it. Create a branch, implement, test, commit with RALPH prefix, push branch, create PR, and close the issue when completed. Do not run watch-mode or long-running server commands. Use one-shot commands only. When complete, stop and return your final summary. Follow all instructions in the provided context.

${CONTEXT}"

set +e
if command -v gtimeout >/dev/null 2>&1; then
	gtimeout "$ITERATION_TIMEOUT_SECONDS" copilot --model "$COPILOT_MODEL" --yolo --no-ask-user --max-autopilot-continues 5 -p "$PROMPT_TEXT"
	COPILOT_EXIT=$?
elif command -v timeout >/dev/null 2>&1; then
	timeout "$ITERATION_TIMEOUT_SECONDS" copilot --model "$COPILOT_MODEL" --yolo --no-ask-user --max-autopilot-continues 5 -p "$PROMPT_TEXT"
	COPILOT_EXIT=$?
else
	perl -e 'my $t = shift @ARGV; alarm $t; exec @ARGV or die $!;' "$ITERATION_TIMEOUT_SECONDS" copilot --model "$COPILOT_MODEL" --yolo --no-ask-user --max-autopilot-continues 5 -p "$PROMPT_TEXT"
	COPILOT_EXIT=$?
fi
set -e

if [ "$COPILOT_EXIT" -ne 0 ]; then
	if [ "$COPILOT_EXIT" -eq 124 ] || [ "$COPILOT_EXIT" -eq 142 ]; then
		echo "Copilot iteration timed out after ${ITERATION_TIMEOUT_SECONDS}s; continuing loop."
	else
		echo "Copilot exited with status ${COPILOT_EXIT}; continuing loop."
	fi
fi

echo "Iteration finished."
