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

Open OCNE, go to `Local Agent`, paste the token, connect, then run commands. Every command must be approved in the agent terminal before it runs.
By default, approval happens in the website by typing `APPROVE` before sending the command.

For the older terminal-window approval prompt, start the agent with:

```powershell
$env:OCNE_AGENT_APPROVAL="terminal"
npm run agent
```

## Choose A Workspace

Start it from the folder you want to allow, or set:

```powershell
$env:OCNE_AGENT_WORKSPACE="D:\my-project"
npm run agent
```

Commands run inside that folder.
