# OCNE Local Agent

The OCNE Local Agent lets the OCNE website ask your own computer to run commands. The browser cannot install software or edit files by itself, so this agent must be running locally.

## Start

From the project folder:

```powershell
npm run agent
```

The agent prints:

- local URL
- token
- workspace folder

Open OCNE, go to `Local Agent`, paste the token, connect, then run commands.
By default, approval happens in the website by typing `APPROVE` before sending the command. Approval clears after every run.

For the older terminal-window approval prompt, start the agent with:

```powershell
$env:OCNE_AGENT_APPROVAL="terminal"
npm run agent
```

## No-Token Local Test Mode

For quick local testing only:

```powershell
npm run agent:no-token
```

The website will still require `APPROVE` before each command. Do not use no-token mode on a shared or untrusted computer.

## Direct Mode

For the normal terminal feeling, where the user starts the agent once and the website can run commands without typing `APPROVE` each time:

```powershell
npm run agent:direct
```

You can also disable approval explicitly with either setting:

```powershell
$env:OCNE_AGENT_REQUIRE_APPROVAL="false"
npm run agent
```

```powershell
$env:OCNE_AGENT_APPROVAL="direct"
npm run agent
```

Accepted off values are `false`, `0`, `no`, and `off`. `OCNE_AGENT_APPROVAL` also accepts `direct`, `none`, and `disabled`. Restart the agent after changing these values, then reconnect the website so it reads the new health status.

Direct mode runs commands with the same file permissions as the local Windows user. That means commands can read and change files anywhere that Windows user can access, including other drives when the command uses an absolute path like `D:\folder`.

Use this only when the user trusts the connected OCNE website session.

## Allow Only One OCNE User

Every command request includes the signed-in OCNE user's id, email, and display name. The agent logs that identity before it runs the command.

To allow only one account by email:

```powershell
$env:OCNE_AGENT_ALLOWED_USER_EMAIL="you@example.com"
npm run agent
```

Or allow only one account by user id:

```powershell
$env:OCNE_AGENT_ALLOWED_USER_ID="your-ocne-user-id"
npm run agent
```

Token mode is still the stronger protection. Use no-token mode only for your own local testing.

## Choose A Workspace

Start it from the folder you want to allow, or set:

```powershell
$env:OCNE_AGENT_WORKSPACE="D:\my-project"
npm run agent
```

Commands run inside that folder.
