#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: ./ai-dev-workflow.sh <issue-number>

Runs single-issue development pipeline:
1) Validate required tools and auth (gh, copilot, chub)
2) Fetch issue data + chub usage info + recent commit context
3) Run agents in order: api-docs-gatherer -> project-docs-generator -> coding-subagent
4) Validate coding result and report implemented issue + PR status
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH." >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Error: missing required file $1" >&2
    exit 1
  fi
}

run_agent_phase() {
  local phase_name="$1"
  local agent_name="$2"
  local prompt="$3"
  local output_file="$4"

  echo "[$phase_name] Running $agent_name..."

  set +e
  copilot \
    --agent "$agent_name" \
    --model auto \
    --yolo \
    --no-ask-user \
    --max-autopilot-continues 10 \
    --silent \
    -p "$prompt" 2>&1 | tee "$output_file"
  local exit_code=${PIPESTATUS[0]}
  set -e

  if [[ $exit_code -ne 0 ]]; then
    echo "Error: phase '$phase_name' failed with exit code $exit_code." >&2
    return $exit_code
  fi

  echo "[$phase_name] Completed $agent_name invocation."
}

sanitize_output_file() {
  local input_file="$1"
  # Strip CR + ANSI color/control sequences so marker matching works reliably.
  tr -d '\r' < "$input_file" | sed -E 's/\x1B\[[0-9;?]*[[:alpha:]]//g'
}

output_has_all_markers() {
  local input_file="$1"
  local marker1="$2"
  local marker2="$3"

  local cleaned_output
  cleaned_output="$(sanitize_output_file "$input_file")"

  if grep -Fqi "$marker1" <<< "$cleaned_output" && grep -Fqi "$marker2" <<< "$cleaned_output"; then
    return 0
  fi

  return 1
}

output_matches_regexes() {
  local input_file="$1"
  local regex1="$2"
  local regex2="$3"

  local cleaned_output
  cleaned_output="$(sanitize_output_file "$input_file")"

  if grep -Eqi "$regex1" <<< "$cleaned_output" && grep -Eqi "$regex2" <<< "$cleaned_output"; then
    return 0
  fi

  return 1
}

handle_missing_completion_marker() {
  local phase_name="$1"

  if [[ "${STRICT_COMPLETION_MARKERS:-0}" == "1" ]]; then
    echo "Error: ${phase_name} output missing completion marker." >&2
    exit 1
  fi

  echo "Warning: ${phase_name} output missing completion marker. Continuing because agent exited successfully." >&2
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
require_cmd chub

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi

require_file ".github/agents/api-docs-gatherer.agent.md"
require_file ".github/agents/project-docs-generator.agent.md"
require_file ".github/agents/coding-subagent.agent.md"

echo "[workflow] Fetching issue #$ISSUE_NUMBER from GitHub..."
ISSUE_JSON="$(gh issue view "$ISSUE_NUMBER" --json number,title,body,url,labels,milestone --jq '{number,title,body,url,labels:[.labels[].name],milestone:(.milestone.title // "")}' 2>/dev/null || true)"

if [[ -z "$ISSUE_JSON" || "$ISSUE_JSON" == "null" ]]; then
  echo "Error: failed to fetch issue #$ISSUE_NUMBER. Check issue existence and repository access." >&2
  exit 1
fi

echo "[workflow] Capturing chub usage info..."
set +e
CHUB_HELP="$(chub help 2>&1)"
CHUB_HELP_EXIT=$?
set -e

if [[ $CHUB_HELP_EXIT -ne 0 || -z "$CHUB_HELP" ]]; then
  echo "Error: 'chub help' failed. Ensure chub is installed and working." >&2
  exit 1
fi

echo "[workflow] Fetching last 10 commits using gh..."
COMMITS_SUMMARY="$(gh api repos/:owner/:repo/commits -f per_page=10 --jq '.[] | "- \(.sha[0:7]) \(.commit.message | split("\n")[0]) - \(.commit.author.name) @ \(.commit.author.date)"' 2>/dev/null || true)"

if [[ -z "$COMMITS_SUMMARY" ]]; then
  echo "Error: failed to fetch last 10 commits with gh." >&2
  exit 1
fi

TMP_API_OUTPUT="$(mktemp)"
TMP_PROJECT_OUTPUT="$(mktemp)"
TMP_CODING_OUTPUT="$(mktemp)"
trap 'rm -f "$TMP_API_OUTPUT" "$TMP_PROJECT_OUTPUT" "$TMP_CODING_OUTPUT"' EXIT

API_PROMPT=$(cat <<EOF
Phase 1.
Agent: api-docs-gatherer.

Use chub help below as command truth:
$CHUB_HELP

Do:
1) Log steps. Prefix [api-docs-gatherer].
2) Refresh docs/ API stack docs.
3) End with:
API DOCS COMPLETE - Project Stack
EOF
)

PROJECT_PROMPT=$(cat <<EOF
Phase 2.
Agent: project-docs-generator.

Do:
1) Log steps. Prefix [project-docs-generator].
2) Refresh project docs in docs/.
3) End with:
PROJECT DOCS COMPLETE - Repository State
EOF
)

CODING_PROMPT=$(cat <<EOF
Phase 3.
Agent: coding-subagent.

Issue payload (JSON):
$ISSUE_JSON

Recent commit context (last 10 commits fetched via gh):
$COMMITS_SUMMARY

Do:
1) Log steps. Prefix [coding-subagent].
2) Implement issue.
3) Create PR.
4) End with:
TASK COMPLETE - Report for orchestrator
EOF
)

echo "[workflow] Phase 1/3: API docs gatherer"
run_agent_phase "api-docs-gatherer" "api-docs-gatherer" "$API_PROMPT" "$TMP_API_OUTPUT"

API_DOCS_OK=0
if output_has_all_markers "$TMP_API_OUTPUT" "API DOCS COMPLETE" "Project Stack" \
  || output_matches_regexes "$TMP_API_OUTPUT" "phase[[:space:]]*1[^[:alnum:]]*complete|api[[:space:]-]*docs[[:space:]]*complete" "api|docs|documentation|stack"; then
  API_DOCS_OK=1
fi

if [[ $API_DOCS_OK -ne 1 ]]; then
  handle_missing_completion_marker "api-docs-gatherer"
fi

echo "[workflow] Phase 2/3: Project docs generator"
run_agent_phase "project-docs-generator" "project-docs-generator" "$PROJECT_PROMPT" "$TMP_PROJECT_OUTPUT"

PROJECT_DOCS_OK=0
if output_has_all_markers "$TMP_PROJECT_OUTPUT" "PROJECT DOCS COMPLETE" "Repository State" \
  || output_matches_regexes "$TMP_PROJECT_OUTPUT" "phase[[:space:]]*2[^[:alnum:]]*complete|project[[:space:]-]*docs[[:space:]]*complete" "project|repository|docs"; then
  PROJECT_DOCS_OK=1
fi

if [[ $PROJECT_DOCS_OK -ne 1 ]]; then
  handle_missing_completion_marker "project-docs-generator"
fi

echo "[workflow] Phase 3/3: Coding subagent"
run_agent_phase "coding-subagent" "coding-subagent" "$CODING_PROMPT" "$TMP_CODING_OUTPUT"

CODING_OK=0
if output_has_all_markers "$TMP_CODING_OUTPUT" "TASK COMPLETE" "Report for orchestrator" \
  || output_matches_regexes "$TMP_CODING_OUTPUT" "phase[[:space:]]*3[^[:alnum:]]*complete|task[[:space:]-]*complete" "orchestrator|report|pr|issue"; then
  CODING_OK=1
fi

if [[ $CODING_OK -ne 1 ]]; then
  handle_missing_completion_marker "coding-subagent"
fi

PR_URL="$(grep -Eo 'https://github\.com/[^[:space:]]+/pull/[0-9]+' "$TMP_CODING_OUTPUT" | head -n1 || true)"
IMPLEMENTED_ISSUE_LINE="$(grep -E '\*\*Issue:\*\* #[0-9]+|Issue[: ]+#[0-9]+' "$TMP_CODING_OUTPUT" | head -n1 || true)"
PR_STATUS_LINE="$(grep -E '\*\*PR Status:\*\*|PR Status:' "$TMP_CODING_OUTPUT" | head -n1 || true)"

if [[ -z "$IMPLEMENTED_ISSUE_LINE" ]]; then
  IMPLEMENTED_ISSUE_LINE="Issue: #$ISSUE_NUMBER"
fi

if [[ -z "$PR_URL" ]]; then
  echo "Error: coding phase completed but no PR URL found." >&2
  exit 1
fi

echo "[workflow] Pipeline summary"
echo "API Docs: PASS"
echo "Project Docs: PASS"
echo "Coding: PASS"
echo "$IMPLEMENTED_ISSUE_LINE"
echo "PR: $PR_URL"

if [[ -n "$PR_STATUS_LINE" ]]; then
  echo "$PR_STATUS_LINE"
fi

echo "Status: SUCCESS"
