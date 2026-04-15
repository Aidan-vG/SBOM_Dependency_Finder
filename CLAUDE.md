# Mendix AI Engineering Toolkit — Claude Code Instructions

## Safety Rules (NON-NEGOTIABLE)

- NEVER run commands that delete, destroy, or modify production resources
- NEVER use AWS credentials for production accounts — only sandbox accounts
- NEVER deploy code, infrastructure, or configuration changes — a human must do this
- NEVER run `terraform apply`, `terraform destroy`, `kubectl apply`, `kubectl delete` against production
- NEVER read or output secrets, API keys, tokens, or credentials from files or environment variables
- NEVER run commands with `sudo`
- NEVER run `rm -rf` on any path outside the current project directory
- NEVER disable, bypass, or modify the guardrail hooks in `.claude/hooks/`
- NEVER push to `main` or `master` branches directly

## When In Doubt

If you are unsure whether a command is safe to run, **do not run it**. Instead, explain what you would do and let the human decide.

## AWS Context

- We use AWS Bedrock for AI model invocation
- Sandbox accounts are accessed via Mendix SSO
- Production accounts exist on the same machine — DO NOT use them
- If a command references an AWS profile or region you don't recognize, STOP and ask

## Coding Standards

- Follow existing code patterns in the repository
- Run tests after making changes: see project-specific test commands
- Do not add dependencies without asking
- Do not refactor code beyond what was requested
