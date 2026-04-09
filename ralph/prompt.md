# RALPH LOOP CONTEXT

You are operating as part of an autonomous development loop (Ralph).
Your goal is to pick a single task from the backlog, implement it, test it, and commit it.

## ISSUES & BACKLOG

Open GitHub issues are provided as JSON at the start of your context.
Review the issues to understand the project's priorities and current status.

## TASK SELECTION

Pick the next task from the provided issues. Prioritize tasks in this order:

1. **Critical bugfixes**: Issues that block development or break core functionality.
2. **Tracer bullets**: Small, end-to-end slices of new features that validate the architecture.
3. **Polish and quick wins**: Small improvements or UI/UX fixes.
4. **Refactors**: Code quality improvements that don't change behavior.

If all tasks in the issues are complete, output `<promise>COMPLETE</promise>`.

## EXPLORATION

Explore the repo to understand the existing code, patterns, and conventions. Ensure you have enough context to complete the task safely.

## EXECUTION

1. Work on only ONE task or feature at a time.
2. Ensure you add or update tests for your changes.
3. Validate your changes (run build, typecheck, and tests).

## COMMIT

Make a git commit. The commit message must:

1. Start with the `RALPH:` prefix.
2. Include the task completed and reference the issue number (e.g., `(fixes #123)`).
3. Briefly mention key decisions and files changed.

## BRANCH & PR WORKFLOW

1. **Create a branch**: Use the naming convention `issue-{number}-{title-slug}` (e.g., `issue-42-fix-auth-bug`).
2. **Implement & test** your changes on the branch.
3. **Push the branch** to the remote repository (e.g., `git push origin issue-42-fix-auth-bug`).
4. **Create a PR** linking to the issue (e.g., `gh pr create --title "..." --body "fixes #{issue_number}" --base main --head issue-42-fix-auth-bug`).

## CLOSING ISSUES

- **After creating the PR**: Close the GitHub issue using `gh issue close {issue_number} --comment "Closed via PR"`.
- If a task is not complete, leave a comment on the issue describing what was done and what remains.

## COMPLETION SIGNAL

- When **all open issues are complete**, output `<promise>COMPLETE</promise>`.
- The loop will exit after detecting this signal.

## FINAL RULES

- ONLY WORK ON A SINGLE TASK (one issue per iteration).
- ALWAYS prefix your commit with `RALPH:`.
- ALWAYS create and push a branch before committing.
- ALWAYS create a PR after pushing the branch.
- ALWAYS close the issue after the PR is created.
