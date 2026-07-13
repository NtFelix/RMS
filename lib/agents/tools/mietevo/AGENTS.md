# Mietevo AI Agent Tools Reference

This document outlines the tools available to the Mietevo AI Agents. These tools allow agents to query and manage data within an organization while automatically respecting the RBAC (Role-Based Access Control) permissions of the executing agent's context.

## Available Tools

### 1. `fetchMieter`
- **Description:** Retrieve a list of tenants (Mieter) in the organization.
- **Permission required:** `mieter.ansehen`
- **Parameters:**
  - `hausId` (UUID, optional): Filter tenants belonging to a specific house.
  - `search` (string, optional): Search query matching tenant name or email.
  - `limit` (number, default 50): Limit the number of records returned.

### 2. `fetchFinanzen`
- **Description:** Retrieve a summary of financial transactions.
- **Permission required:** `finanzen.ansehen`
- **Parameters:**
  - `hausId` (UUID, optional): Filter transactions belonging to a specific house.
  - `limit` (number, default 50): Limit the number of transaction logs returned.

### 3. `createAufgabe`
- **Description:** Create a new task or todo item.
- **Permission required:** `aufgaben.erstellen`
- **Parameters:**
  - `titel` (string, required): The title of the task.
  - `beschreibung` (string, optional): A detailed description of the task.
  - `hausId` (UUID, optional): Assign the task to a specific house.

### 4. `getHaeuser`
- **Description:** Retrieve a list of houses in the organization.
- **Permission required:** `haeuser.ansehen`
- **Parameters:**
  - `limit` (number, default 50): Limit the number of houses returned.
