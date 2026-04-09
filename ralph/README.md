# Gemini Ralph Loop

This folder contains the implementation of the autonomous "Ralph" development loop using the Gemini CLI. Ralph is designed to explore the codebase, identify tasks, and implement features or fixes autonomously.

## Contents

- `prompt.md`: The base instruction set for the Gemini agent.
- `worker.sh`: A script that runs a single iteration of the loop (fetches context, calls Gemini).
- `run.sh`: The main loop orchestrator that runs multiple iterations.

## Usage

To start the autonomous loop, run the following command from the project root:

```bash
./ralph/run.sh <number_of_iterations>
```

For example, to run 5 iterations:

```bash
./ralph/run.sh 5
```

## How it Works

1. **Context Fetching**: `worker.sh` retrieves recent commit history and relevant files to provide context on what has already been done.
2. **Task Selection**: The agent explores the repository (PRDs, issues, README) to determine the next highest-priority task.
3. **Execution**: The agent implements the task, adds tests, and validates the code.
4. **Commit**: Work is automatically committed with descriptive messages.
5. **Completion Signal**: When the agent determines all tasks are complete, it signals the loop to exit early.

## Notes

- Ensure you have the Gemini CLI installed and configured.
- The loop uses `pnpm` for dependency management as per the project standards.
