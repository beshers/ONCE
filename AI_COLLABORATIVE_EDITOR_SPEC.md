# AI-Assisted Collaborative Project Editor Specification

## 1. Purpose

OCNE will provide a project-based development workspace where users can write code, collaborate in real time, optionally use an AI coding agent, and optionally connect the project to the OCNE Desktop Agent for local terminal and file access.

The feature is opt-in per project. A project must never get AI access, terminal access, or local file access unless the project owner explicitly enables it and the current user has the correct role.

## 2. Product Goals

- Let users choose how each project works: solo, invited team, or public collaboration.
- Add an AI agent that can help with code explanation, generation, review, debugging, and planning.
- Integrate the OCNE Desktop/Terminal Agent into the editor for approved local commands.
- Make permission choices clear before any risky action happens.
- Provide a path to real-time collaborative editing with presence, shared reviews, and version history.
- Keep local machine access bounded by explicit user consent, project settings, and desktop agent pairing.

## 3. Non-Goals

- The website must not directly access arbitrary local files without the desktop agent or a browser-approved file picker.
- AI must not silently execute commands.
- The app must not bypass antivirus, OS prompts, admin approval, or system security controls.
- Admin mode must not be used as a substitute for code signing, clear consent, or safe design.

## 4. Roles And Capabilities

| Role | Capabilities |
| --- | --- |
| Owner | Full project control, settings, collaborators, AI settings, terminal settings, local access settings, delete/archive. |
| Editor | Edit files, create files, comment, use AI if enabled, use terminal if enabled and allowed. |
| Viewer | View code, comments, shared AI conversations, and project metadata. No editing or terminal execution. |
| Guest | Future optional role for invite links. Temporary and restricted access. |

## 5. Project Settings

Projects should store these settings:

```ts
type CollaborationMode = "solo" | "team" | "public";
type AiVisibility = "private" | "shared";
type LocalAccessMode = "none" | "read" | "read_write";
type TerminalMode = "disabled" | "manual" | "ai_suggested" | "ai_confirmed";

interface ProjectAgentSettings {
  aiAgentEnabled: boolean;
  terminalAgentEnabled: boolean;
  localFilesEnabled: boolean;
  collaborationMode: CollaborationMode;
  aiVisibility: AiVisibility;
  localAccessMode: LocalAccessMode;
  terminalMode: TerminalMode;
}
```

Current implementation already includes:

- `aiAgentEnabled`
- `localFilesEnabled`
- `collaborationMode`

Future migrations should add:

- `terminalAgentEnabled`
- `aiVisibility`
- `localAccessMode`
- `terminalMode`

## 6. Project Creation Flow

When creating a project, the user can choose:

- Name, description, language, public/private visibility.
- AI coding agent enabled or disabled.
- Local file access enabled or disabled.
- Collaboration mode:
  - `solo`: owner only.
  - `team`: invited collaborators only.
  - `public`: wider collaboration rules.

Default values:

- AI agent: off.
- Local files: off.
- Collaboration: solo.
- Terminal agent: off or manual only.
- Local access mode: none.
- AI visibility: private.

## 7. AI Agent

The AI agent can:

- Explain selected code.
- Generate code snippets.
- Suggest file changes.
- Review code for bugs and style issues.
- Summarize project structure.
- Answer questions using approved project context.
- Suggest terminal commands.
- Interpret terminal errors.

The AI agent cannot:

- Read files outside allowed project/local scope.
- Execute commands without confirmation.
- Change project settings.
- Add collaborators.
- Access secrets unless explicitly included by the user.
- Share private AI conversations with collaborators unless AI visibility is `shared`.

## 8. AI Context Rules

Context should be assembled by an AI service, not directly by the frontend.

Allowed context:

- Project metadata.
- Open file.
- Selected text.
- Files the user can access.
- Recent review comments.
- Terminal output explicitly shared with AI.

Excluded context:

- Files outside project scope.
- Local files unless local access is enabled and approved.
- Environment secrets by default.
- Other users' private AI conversations.
- Terminal output marked private.

Large projects must use context limits:

- Prioritize current file and selected text.
- Include file tree summary.
- Include only relevant neighboring files.
- Use summaries for large files.
- Use diff-based context for recent edits.

## 9. Real-Time Collaboration

Required collaboration behavior:

- Multiple users can open a project simultaneously.
- Presence shows who is online.
- Team/public projects refresh files, comments, and collaborators.
- Real-time editing should use CRDT or OT.
- Unsaved local edits must not be overwritten by remote updates.
- Version history must preserve important saves.

Recommended architecture:

- Monaco editor for code editing.
- Yjs for collaborative text state.
- WebSocket collaboration service.
- Awareness protocol for cursors, selections, and presence.
- Server persistence of document snapshots.

Conflict behavior:

- Text conflicts are handled by CRDT.
- File rename/delete conflicts should show a clear prompt.
- If a file is deleted while another user edits it, preserve the editing user's content as a recovery draft.
- If a user reconnects after offline edits, merge where possible and create a conflict snapshot if needed.

## 10. Terminal Agent

The editor should contain a Terminal Agent panel.

Capabilities:

- Pair with OCNE Desktop Agent.
- Show connection status.
- Show paired account.
- Run commands.
- Display stdout/stderr.
- Keep command history.
- Show last command and result in the desktop app.

Modes:

- `disabled`: no terminal panel actions.
- `manual`: user types and runs commands.
- `ai_suggested`: AI can suggest commands but user runs them.
- `ai_confirmed`: AI can prepare a command, but user must approve before execution.

High-risk commands require extra confirmation:

- File deletion.
- Recursive moves/copies.
- External downloads.
- Package installs.
- Running downloaded scripts.
- System settings changes.
- Commands outside approved workspace.
- Commands requiring admin privileges.

## 11. Local File Access

Local access is mediated by OCNE Desktop Agent.

Modes:

- `none`: no local file access.
- `read`: list/read approved folders only.
- `read_write`: read and write approved folders.

Desktop Agent requirements:

- Listen only on `127.0.0.1`.
- Restrict accepted website origin to OCNE.
- Require secure pairing.
- Show paired OCNE account.
- Show current access mode.
- Enforce allowed folders.
- Reject paths outside allowed scope.
- Log reads/writes/commands.

The user must be able to disconnect the desktop app from the website.

## 12. Permissions

Permission checks must exist in three layers.

Frontend:

- Hide disabled actions.
- Show warnings before risky operations.
- Require confirmation for terminal and write actions.

Backend:

- Validate user role.
- Validate project settings.
- Validate collaborator access.
- Write audit logs.
- Reject unauthorized operations.

Desktop Agent:

- Validate pairing token/account.
- Validate origin.
- Validate allowed folders.
- Validate read/write mode.
- Return structured errors.

## 13. Audit Logs

Sensitive actions should be logged:

```ts
interface AuditLog {
  id: number;
  userId: string;
  projectId?: number;
  actionType:
    | "project.settings.update"
    | "ai.prompt"
    | "ai.file_suggestion"
    | "terminal.command"
    | "local_file.read"
    | "local_file.write"
    | "collaborator.add"
    | "collaborator.remove";
  target?: string;
  riskLevel: "low" | "medium" | "high";
  status: "allowed" | "blocked" | "failed" | "completed";
  details?: string;
  createdAt: Date;
}
```

Terminal command logs should include:

- Command.
- User.
- Project.
- Agent type: server or desktop.
- Working directory.
- Exit code.
- Output summary.
- Timestamp.

## 14. Backend Services

Project Service:

- Project metadata.
- Files.
- Collaborators.
- Settings.
- Versions.

Collaboration Service:

- WebSocket sessions.
- Presence.
- Cursor awareness.
- CRDT sync.
- Snapshot persistence.

AI Service:

- Permission-filtered context builder.
- Prompt handling.
- File suggestion generation.
- AI conversation storage.
- Command suggestion risk scoring.

Terminal Service:

- Server-side terminal sessions.
- Desktop Agent bridge support.
- Command risk classification.
- Command audit logs.

Audit Service:

- Central logging for permissions, terminal actions, AI actions, file access, and collaborator changes.

## 15. Execution Environments

Server terminal:

- Should run inside isolated containers.
- One environment per project or session.
- Resource limits required.
- Network policy configurable.
- Filesystem mounted to project workspace only.

Desktop terminal:

- Runs on the user's computer through OCNE Desktop Agent.
- Uses the OS user's permissions.
- Must be visibly paired and disconnectable.
- Must not expose a public network listener.

## 16. API Shape

Project settings:

```ts
project.updateSettings({
  projectId,
  aiAgentEnabled,
  terminalAgentEnabled,
  localFilesEnabled,
  localAccessMode,
  collaborationMode,
  aiVisibility,
  terminalMode,
})
```

AI:

```ts
ai.ask({
  projectId,
  fileId,
  selectedText,
  prompt,
  visibility,
})
```

Terminal command:

```ts
terminal.run({
  projectId,
  agentType: "server" | "desktop",
  command,
  approvalToken,
})
```

Collaboration:

```ts
collaboration.joinProject({ projectId })
collaboration.leaveProject({ projectId })
collaboration.updatePresence({ projectId, fileId, cursor })
```

## 17. Edge Cases

Desktop Agent offline:

- Disable run buttons.
- Show clear disconnected status.
- Preserve endpoint and token if the user chose stay connected.

Stale pairing token:

- Pairing fails with structured error.
- Ask user to copy the current token from the desktop app.

Owner disables local access during active session:

- Close or block new local commands.
- Show reason in terminal panel.

Viewer tries to execute a command:

- Backend rejects with permission error.
- Frontend shows no terminal run controls.

AI suggests unsafe command:

- Mark command high risk.
- Require confirmation or block by policy.

Connection drop during collaboration:

- Keep local draft.
- Auto-reconnect.
- Merge with CRDT.
- Create recovery snapshot if merge is unsafe.

Large project:

- Context builder uses summaries and selected files only.
- AI panel explains when context was truncated.

File deleted while another user edits:

- Keep editing user's text as a recovery draft.
- Show restore option.

Permissions changed while page is open:

- Refetch settings.
- Disable newly unauthorized actions immediately.

## 18. Implementation Phases

Phase 1: Project Settings And UI

- Project create settings.
- Editor settings tab.
- AI Agent tab placeholder.
- Terminal Agent tab.
- Database columns.

Phase 2: Permissions And Audit

- Add missing project setting fields.
- Add audit log table.
- Enforce terminal/local access rules.
- Enforce AI visibility and role checks.

Phase 3: Real-Time Collaboration

- Add WebSocket collaboration service.
- Add Yjs document sync.
- Add presence/cursors.
- Add reconnect and recovery behavior.

Phase 4: AI Backend

- Add AI service.
- Add project context builder.
- Add AI conversations.
- Add file suggestions.
- Add command suggestion risk scoring.

Phase 5: Safer Execution

- Containerized server terminal.
- Desktop Agent file scope controls.
- Command risk classifier.
- More detailed command approval UI.

Phase 6: Advanced Features

- Git branch/commit/PR tools.
- AI pair-programming mode.
- Voice interaction.
- Plugin system.
- Audit replay sessions.

