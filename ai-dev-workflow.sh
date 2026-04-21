#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: ./dev-pipeline.sh <issue-number>

Runs single-issue development pipeline:
1) Fetch issue data from GitHub
2) Invoke Copilot CLI with orchestrator agent
3) Print implemented issue and raised PR
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH." >&2
    exit 1
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

ISSUE_NUMBER="$1"
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "Error: issue number must be numeric." >&2
  exit 1
fi

require_cmd gh
require_cmd copilot

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi

if [[ ! -f ".github/agents/orchestrator.agent.md" ]]; then
  echo "Error: missing agent file .github/agents/orchestrator.agent.md" >&2
  exit 1
fi

echo "[1/3] Fetching issue #$ISSUE_NUMBER from GitHub..."
ISSUE_JSON="$(gh issue view "$ISSUE_NUMBER" --json number,title,body,url,labels,milestone --jq '{number,title,body,url,labels:[.labels[].name],milestone:(.milestone.title // "")}' 2>/dev/null || true)"

if [[ -z "$ISSUE_JSON" || "$ISSUE_JSON" == "null" ]]; then
  echo "Error: failed to fetch issue #$ISSUE_NUMBER. Check issue existence and repository access." >&2
  exit 1
fi

PROMPT=$(cat <<EOF
You are running a single-issue development pipeline.

Use agent: orchestrator.

Issue payload (JSON):
$ISSUE_JSON

Required execution order:
1. Call api-docs-gatherer first.
2. Then call project-docs-generator.
3. Then call coding-subagent and pass the full issue payload.
4. Then call task-reporter.

Final output requirements:
- Include implemented issue number and title.
- Include PR URL raised by coding-subagent.
- Clearly indicate completion status.
EOF
)

echo "[2/3] Running Copilot orchestrator pipeline..."
TMP_OUTPUT="$(mktemp)"
trap 'rm -f "$TMP_OUTPUT"' EXIT

set +e
copilot \
  --agent orchestrator \
  --model gpt-5.3-codex \
  --yolo \
  --no-ask-user \
  --max-autopilot-continues 10 \
  --silent \
  -p "$PROMPT" | tee "$TMP_OUTPUT"
COPILOT_EXIT=${PIPESTATUS[0]}
set -e

if [[ $COPILOT_EXIT -ne 0 ]]; then
  echo "Error: Copilot pipeline failed with exit code $COPILOT_EXIT." >&2
  exit $COPILOT_EXIT
fi

PR_URL="$(grep -Eo 'https://github\.com/[^[:space:]]+/pull/[0-9]+' "$TMP_OUTPUT" | head -n1 || true)"
IMPLEMENTED_ISSUE_LINE="$(grep -E 'Issue[: ]+#[0-9]+' "$TMP_OUTPUT" | head -n1 || true)"

if [[ -z "$PR_URL" ]]; then
  echo "Error: pipeline completed but no PR URL found in orchestrator output." >&2
  exit 1
fi

if [[ -z "$IMPLEMENTED_ISSUE_LINE" ]]; then
  IMPLEMENTED_ISSUE_LINE="Issue: #$ISSUE_NUMBER"
fi

echo "[3/3] Pipeline summary"
echo "$IMPLEMENTED_ISSUE_LINE"
echo "PR: $PR_URL"
echo "Status: SUCCESS"
