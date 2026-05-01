const http = require("node:http");
const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const VERSION = "0.5.1";

function cleanEnv(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function readEnvFlag(name, fallback) {
  const normalized = cleanEnv(name, fallback ? "true" : "false").toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function readApprovalConfig() {
  const rawMode = cleanEnv("OCNE_AGENT_APPROVAL", "web").toLowerCase();
  const disabledByMode = ["direct", "none", "off", "false", "no", "disabled"].includes(rawMode);
  const approvalRequired = !disabledByMode && readEnvFlag("OCNE_AGENT_REQUIRE_APPROVAL", true);
  const approvalMode = rawMode === "terminal" ? "terminal" : "web";

  return {
    approvalMode,
    approvalRequired,
    rawApprovalMode: rawMode,
  };
}

const PORT = Number(cleanEnv("OCNE_AGENT_PORT", "48731"));
const ALLOW_NO_TOKEN = readEnvFlag("OCNE_AGENT_NO_TOKEN", false);
const TOKEN = ALLOW_NO_TOKEN ? "" : cleanEnv("OCNE_AGENT_TOKEN", crypto.randomBytes(18).toString("hex"));
const WORKSPACE = path.resolve(cleanEnv("OCNE_AGENT_WORKSPACE", process.cwd()));
const APPROVAL_CONFIG = readApprovalConfig();
const REQUIRE_APPROVAL = APPROVAL_CONFIG.approvalRequired;
const APPROVAL_MODE = APPROVAL_CONFIG.approvalMode;
const ALLOWED_USER_ID = cleanEnv("OCNE_AGENT_ALLOWED_USER_ID", "");
const ALLOWED_USER_EMAIL = cleanEnv("OCNE_AGENT_ALLOWED_USER_EMAIL", "").toLowerCase();
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
    "Access-Control-Allow-Headers": "content-type,x-ocne-agent-token,x-ocne-user-id,x-ocne-user-email,x-ocne-user-name",
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

function requesterFrom(req, body) {
  const bodyRequester = body && typeof body.requester === "object" ? body.requester : {};
  return {
    id: String(req.headers["x-ocne-user-id"] || bodyRequester.id || "").trim(),
    email: String(req.headers["x-ocne-user-email"] || bodyRequester.email || "").trim().toLowerCase(),
    name: String(req.headers["x-ocne-user-name"] || bodyRequester.name || "").trim(),
  };
}

function requesterLabel(requester) {
  const name = requester.name || "Unknown OCNE user";
  const email = requester.email ? ` <${requester.email}>` : "";
  const id = requester.id ? ` (${requester.id})` : "";
  return `${name}${email}${id}`;
}

function requireAllowedRequester(req, res, body) {
  const requester = requesterFrom(req, body);

  if (ALLOWED_USER_ID && requester.id !== ALLOWED_USER_ID) {
    sendJson(res, 403, {
      ok: false,
      error: "This local agent only allows commands from the configured OCNE user id.",
      code: "USER_NOT_ALLOWED",
    });
    return null;
  }

  if (ALLOWED_USER_EMAIL && requester.email !== ALLOWED_USER_EMAIL) {
    sendJson(res, 403, {
      ok: false,
      error: "This local agent only allows commands from the configured OCNE user email.",
      code: "USER_NOT_ALLOWED",
    });
    return null;
  }

  return requester;
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
    approvalRequired: REQUIRE_APPROVAL,
    tokenRequired: !ALLOW_NO_TOKEN,
    tokenLength: TOKEN.length,
    identificationRequired: Boolean(ALLOWED_USER_ID || ALLOWED_USER_EMAIL),
    allowedUserIdConfigured: Boolean(ALLOWED_USER_ID),
    allowedUserEmailConfigured: Boolean(ALLOWED_USER_EMAIL),
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
      const requester = requireAllowedRequester(req, res, body);
      if (!requester) return;

      const command = String(body.command || "").trim();

      if (!command) {
        sendJson(res, 400, { ok: false, error: "Command is required", code: "COMMAND_REQUIRED" });
        return;
      }
      if (command.length > 4000) {
        sendJson(res, 400, { ok: false, error: "Command is too long", code: "COMMAND_TOO_LONG" });
        return;
      }

      const approved = !REQUIRE_APPROVAL || (APPROVAL_MODE === "terminal" ? await askApproval(command) : hasWebApproval(body));
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
      console.log(`[OCNE Agent] Requested by: ${requesterLabel(requester)}`);
      const result = await runCommand(command);
      sendJson(res, 200, { ...result, requester });
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
  console.log(`Approval:  ${REQUIRE_APPROVAL ? (APPROVAL_MODE === "terminal" ? "terminal prompt" : "website APPROVE field") : "disabled, commands run directly"}`);
  console.log(ALLOWED_USER_ID || ALLOWED_USER_EMAIL
    ? "Identity:  restricted to the configured OCNE user"
    : "Identity:  requester is logged, no user restriction configured");
  if (ALLOW_NO_TOKEN) {
    console.log("WARNING:  No-token mode is for local testing only.");
  }
  if (!REQUIRE_APPROVAL) {
    console.log("WARNING:  Direct mode runs website commands without per-command approval.");
  }
  console.log("Keep this window open while using OCNE Agent.");
  console.log(!REQUIRE_APPROVAL
    ? "Commands run directly after the website connects."
    : APPROVAL_MODE === "terminal"
    ? "Commands require approval here before they run."
    : "Commands require APPROVE in the website before they run.");
  console.log("==============================================");
}

server.listen(PORT, HOST, printBanner);

process.on("SIGINT", () => {
  rl.close();
  server.close(() => process.exit(0));
});
