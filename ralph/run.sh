#!/bin/bash
set -e

# Usage: gemini-ralph/run.sh <iterations>

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

ITERATIONS=$1

for ((i=1; i<=$ITERATIONS; i++)); do
  echo "======================================"
  echo "RALPH ITERATION $i / $ITERATIONS"
  echo "======================================"

  # Call the worker script and capture output
  # We use tee to display output while also capturing it to check for COMPLETE signal
  RESULT=$(./worker.sh | tee /dev/tty)

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
