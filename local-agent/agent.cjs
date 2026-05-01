const http = require("node:http");
const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const VERSION = "0.3.0";

function cleanEnv(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

const PORT = Number(cleanEnv("OCNE_AGENT_PORT", "48731"));
const ALLOW_NO_TOKEN = cleanEnv("OCNE_AGENT_NO_TOKEN", "false").toLowerCase() === "true";
const TOKEN = ALLOW_NO_TOKEN ? "" : cleanEnv("OCNE_AGENT_TOKEN", crypto.randomBytes(18).toString("hex"));
const WORKSPACE = path.resolve(cleanEnv("OCNE_AGENT_WORKSPACE", process.cwd()));
const APPROVAL_MODE = cleanEnv("OCNE_AGENT_APPROVAL", "web").toLowerCase() === "terminal" ? "terminal" : "web";
const HOST = "127.0.0.1";

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  console.error(`[OCNE Agent] Invalid port: ${PORT}`);
  process.exit(1);
}

if (!fs.existsSync(WORKSPACE) || !fs.statSync(WORKSPACE).isDirectory()) {
  console.error(`[OCNE Agent] Workspace does not exist: ${WORKSPACE}`);
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type,x-ocne-agent-token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 128) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function tokenMatches(candidate) {
  const candidateText = String(candidate || "").trim();
  const expected = Buffer.from(TOKEN, "utf8");
  const actual = Buffer.from(candidateText, "utf8");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function requireToken(req, res) {
  if (ALLOW_NO_TOKEN) return true;

  if (!tokenMatches(req.headers["x-ocne-agent-token"])) {
    sendJson(res, 401, {
      ok: false,
      error: "Invalid local agent token. Copy the exact token printed by the current agent window.",
      code: "INVALID_TOKEN",
    });
    return false;
  }
  return true;
}

function askApproval(command) {
  return new Promise((resolve) => {
    console.log("\n[OCNE Agent] Command request");
    console.log(`[Workspace] ${WORKSPACE}`);
    console.log(`[Command] ${command}`);
    rl.question("Approve this command? Type y and press Enter: ", (answer) => {
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

function hasWebApproval(body) {
  return String(body.approval || "").trim().toUpperCase() === "APPROVE";
}

function resolveShell() {
  if (process.platform === "win32") {
    const powershell = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
    return {
      command: powershell,
      argsFor: (userCommand) => ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", userCommand],
    };
  }

  return {
    command: "/bin/bash",
    argsFor: (userCommand) => ["-lc", userCommand],
  };
}

function runCommand(command) {
  const shell = resolveShell();
  return new Promise((resolve) => {
    execFile(shell.command, shell.argsFor(command), {
      cwd: WORKSPACE,
      timeout: 5 * 60 * 1000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      env: process.env,
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: typeof error?.code === "number" ? error.code : 0,
        stdout,
        stderr,
        error: error?.message || null,
      });
    });
  });
}

function agentHealth() {
  return {
    ok: true,
    name: "OCNE Local Agent",
    version: VERSION,
    port: PORT,
    url: `http://${HOST}:${PORT}`,
    platform: process.platform,
    arch: os.arch(),
    hostname: os.hostname(),
    workspace: WORKSPACE,
    approvalMode: APPROVAL_MODE,
    tokenRequired: !ALLOW_NO_TOKEN,
    tokenLength: TOKEN.length,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, agentHealth());
      return;
    }

    if (req.method === "POST" && url.pathname === "/run") {
      if (!requireToken(req, res)) return;
      const body = await readBody(req);
      const command = String(body.command || "").trim();

      if (!command) {
        sendJson(res, 400, { ok: false, error: "Command is required", code: "COMMAND_REQUIRED" });
        return;
      }
      if (command.length > 4000) {
        sendJson(res, 400, { ok: false, error: "Command is too long", code: "COMMAND_TOO_LONG" });
        return;
      }

      const approved = APPROVAL_MODE === "terminal" ? await askApproval(command) : hasWebApproval(body);
      if (!approved) {
        sendJson(res, 403, {
          ok: false,
          error: APPROVAL_MODE === "terminal"
            ? "Command denied on the local computer"
            : "Type APPROVE in the website before sending this command",
          code: "APPROVAL_REQUIRED",
        });
        return;
      }

      console.log(`\n[OCNE Agent] Running approved command: ${command}`);
      const result = await runCommand(command);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found", code: "NOT_FOUND" });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown agent error",
      code: "AGENT_ERROR",
    });
  }
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error("==============================================");
    console.error("[OCNE Agent] Port is already in use");
    console.error(`Port: ${PORT}`);
    console.error("Close the old agent window, or start this agent on another port:");
    console.error("PowerShell:");
    console.error("  $env:OCNE_AGENT_PORT=\"49000\"; npm run agent");
    console.error("CMD:");
    console.error("  set \"OCNE_AGENT_PORT=49000\" && npm run agent");
    console.error("==============================================");
    process.exit(1);
  }

  console.error("[OCNE Agent] Server error:", error);
  process.exit(1);
});

function printBanner() {
  console.log("==============================================");
  console.log("OCNE Local Agent is running");
  console.log(`Version:   ${VERSION}`);
  console.log(`URL:       http://${HOST}:${PORT}`);
  console.log(ALLOW_NO_TOKEN ? "Token:     disabled for local testing" : `Token:     ${TOKEN}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Approval:  ${APPROVAL_MODE === "terminal" ? "terminal prompt" : "website APPROVE field"}`);
  if (ALLOW_NO_TOKEN) {
    console.log("WARNING:  No-token mode is for local testing only.");
  }
  console.log("Keep this window open while using OCNE Agent.");
  console.log(APPROVAL_MODE === "terminal"
    ? "Commands require approval here before they run."
    : "Commands require APPROVE in the website before they run.");
  console.log("==============================================");
}

server.listen(PORT, HOST, printBanner);

process.on("SIGINT", () => {
  rl.close();
  server.close(() => process.exit(0));
});
