# Documentation: The `always-verify-gcp` Skill

## 1. Overview

The `always-verify-gcp` skill is a comprehensive workflow designed to ensure all Google Cloud Platform (GCP) resource management tasks performed by the Gemini CLI agent are safe, accurate, and based on the most current information. 

Its core principle is **"Trust but Verify."** Instead of acting immediately on a user's request, the skill instructs the agent to follow a rigorous, multi-step process that involves selecting the correct command-line tool, verifying the command against official documentation, previewing the impact of the command (if possible), and intelligently diagnosing common errors.

This skill transforms the agent from a simple command executor into a cautious and methodical cloud operator.

## 2. Folder Structure

The skill is composed of a main instruction file and a set of reference guides, organized as follows:

```
always-verify-gcp/
├── SKILL.md
└── references/
    ├── tool_selection_guide.md
    └── error_handling_playbook.md
```

This modular structure follows the "Progressive Disclosure" design principle. The main `SKILL.md` contains the high-level workflow, and it delegates specific, detailed logic to the files in the `references/` directory. This makes the skill easier to read, manage, and update.

## 3. File Breakdown

### `SKILL.md` (The Core Workflow)

This is the main entry point and playbook for the skill. It defines the high-level, step-by-step process the agent must follow for any GCP resource management task.

**Purpose:** To act as the central controller, orchestrating the overall process and telling the agent *when* to consult the more detailed reference guides.

**Contents:**
1.  **Step 1: Select the Correct CLI Tool:** Instructs the agent to consult `references/tool_selection_guide.md`.
2.  **Step 2: Identify the Specific Command:** Once the tool is chosen, find the right command for the task.
3.  **Step 3: Verify Command with Documentation:** The "Trust but Verify" step. The agent must use its `search_documents` tool (its connection to the "Developer Knowledge MCP Server") and the `--help` flag to validate the command's parameters.
4.  **Step 4: Gather Missing Information:** Use the `ask_user` tool to get any required info not provided in the initial prompt.
5.  **Step 5: Formulate the Final Command:** Assemble the full command.
6.  **Step 6: Perform a Dry Run:** A critical safety step. The agent checks for a `--dry-run` flag, executes it to preview the changes, and gets a second, more informed user approval.
7.  **Step 7: Propose and Execute:** The final execution step after all checks and approvals are complete.
8.  **Step 8: Diagnose Errors Intelligently:** Instructs the agent to consult `references/error_handling_playbook.md` if the command fails.

### `references/tool_selection_guide.md` (The Tool Selector)

This file contains the specific logic for choosing the right command-line tool for the job.

**Purpose:** To prevent the error we encountered in our first test, where the agent incorrectly defaulted to `gcloud` for a BigQuery task.

**Contents:**
*   A clear set of heuristics:
    *   If the task involves **BigQuery**, use the `bq` tool.
    *   If the task involves **Cloud Storage**, use the `gsutil` tool.
    *   For most other GCP services, use the `gcloud` tool.

By externalizing this logic, we can easily update it in the future (e.g., to add rules for `terraform` or other tools) without cluttering the main workflow.

### `references/error_handling_playbook.md` (The Error Diagnoser)

This file makes the agent's response to failure more intelligent.

**Purpose:** To provide a structured guide for diagnosing and proposing solutions for common errors, rather than just passively reporting the failure.

**Contents:**
*   A pattern-matching system. The playbook currently defines the first pattern:
    *   **Pattern: Permission Denied:** It looks for keywords like `PERMISSION_DENIED` or `403` in the error output.
    *   **Resolution Steps:** If matched, it instructs the agent to parse the error for the specific permission needed, use `search_documents` to find the corresponding IAM role, and then suggest that role to the user as a concrete solution.

This file is designed to be a living document, ready to be expanded with playbooks for other common errors like "Resource Not Found" or "Quota Exceeded."

## 4. Workflow in Practice: An Example

To see how these files work together, consider the request to "create a BigQuery dataset."

1.  The agent's active `always-verify-gcp` skill is triggered.
2.  It reads **`SKILL.md`**, starting at Step 1.
3.  **Step 1** instructs it to consult **`references/tool_selection_guide.md`**. The agent reads this file and determines that for a BigQuery task, the correct tool is `bq`.
4.  The agent returns to **`SKILL.md`**, moving to Step 2. It identifies `bq mk` as the correct command.
5.  It proceeds through the verification, gathering, and dry run steps as outlined in **`SKILL.md`**.
6.  If, upon execution, the command fails with a permission error, the agent proceeds to the final step in **`SKILL.md`**.
7.  This step instructs it to consult **`references/error_handling_playbook.md`**. The agent reads this file, matches the `PERMISSION_DENIED` pattern, and follows the steps to diagnose and suggest a solution.

This demonstrates a flow of control where the agent uses the main `SKILL.md` as its guide and refers to specialized documents for specific, detailed logic, creating a robust and maintainable system.
