# Gemini Ralph Loop

This folder contains an implementation of the autonomous "Ralph" development loop using the Gemini CLI.

## Contents

- `prompt.md`: The base instruction set for the Gemini agent.
- `worker.sh`: A script that runs a single iteration of the loop (fetches context, calls Gemini).
- `run.sh`: The main loop orchestrator that runs multiple iterations.

## Usage

To start the loop, run:

```bash
./ralph/run.sh <number_of_iterations>
```

For example:

```bash
./ralph/run.sh 5
```

## How it Works

1. **Context Fetching**: `worker.sh` retrieves the last 10 commits prefixed with `RALPH:` to provide context on what has already been done.
2. **Task Selection**: If no specific task is provided, the agent will explore the repository (PRDs, issues, README) to determine the next highest-priority task.
3. **Execution**: The agent will implement the task, add tests, and validate the code.
4. **Commit**: All work is committed with the `RALPH:` prefix.
5. **Completion Signal**: When the agent determines all tasks are complete, it outputs `<promise>COMPLETE</promise>` which signals the loop to exit early.
