---
name: git-commit-formatter
description: Formats git commit messages according to Conventional Commits specification. Use this when the user asks to commit changes or write a commit message.
---

Git Commit Formatter Skill

When writing a git commit message, you MUST follow the Conventional Commits specification.

Format
`<type>[optional scope]: <description>`

`[optional body]`

`[optional footer(s)]`

Allowed Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

Instructions
1. Analyze the changes to determine the primary `type`.
2. Identify the `scope` if applicable (e.g., specific component or file).
3. Write a concise `description` in an imperative mood (e.g., "add feature" not "added feature") for the header.
4. **For complex changes (especially features or large refactors):** 
   - Add a blank line after the header.
   - Provide an optional **body** that explains the *why* or lists specific sub-tasks.
   - Use bullet points (`-`) for multiple distinct changes.
5. If there are breaking changes, add a footer starting with `BREAKING CHANGE:`.

Example (Simple)
`feat(auth): implement login with google`

Example (Complex Feature)
`feat(finance): add export to PDF for billing statements`

`Users can now download their monthly operating cost statements as high-quality PDF files.`
`- added PDF generation service using jspdf`
`- implemented export button in the billing overview table`
`- added progress indicator for long-running exports`
