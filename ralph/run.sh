#!/bin/bash
set -e

# Usage: ralph/run.sh <parent_issue_number> <iterations>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <parent_issue_number> <iterations>"
  echo "Example: $0 42 5"
  exit 1
fi

PARENT_ISSUE=$1
ITERATIONS=$2

for ((i=1; i<=$ITERATIONS; i++)); do
  echo "======================================"
  echo "RALPH ITERATION $i / $ITERATIONS (Parent Issue: #$PARENT_ISSUE)"
  echo "======================================"

  # Call the worker script and capture output
  # We use tee to display output while also capturing it to check for COMPLETE signal
  RESULT=$(./worker.sh "$PARENT_ISSUE" | tee /dev/tty)

  if [[ "$RESULT" == *"<promise>COMPLETE</promise>"* ]]; then
    echo ""
    echo "======================================"
    echo "PRD / Tasks complete! Exiting loop."
    echo "======================================"
    exit 0
  fi

  echo ""
  echo "Iteration $i complete."
  echo "--------------------------------------"
done

echo "Finished $ITERATIONS iterations."
