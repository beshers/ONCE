const http = require("node:http");
const { exec } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const PORT = Number(process.env.OCNE_AGENT_PORT || 48731);
const TOKEN = process.env.OCNE_AGENT_TOKEN || crypto.randomBytes(18).toString("hex");
const WORKSPACE = path.resolve(process.env.OCNE_AGENT_WORKSPACE || process.cwd());
const APPROVAL_MODE = process.env.OCNE_AGENT_APPROVAL || "web";
const VERSION = "0.2.0";

if (!fs.existsSync(WORKSPACE) || !fs.statSync(WORKSPACE).isDirectory()) {
  console.error(`[OCNE Agent] Workspace does not exist: ${WORKSPACE}`);
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type,x-ocne-agent-token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

function requireToken(req, res) {
  if (req.headers["x-ocne-agent-token"] !== TOKEN) {
    sendJson(res, 401, { ok: false, error: "Invalid local agent token" });
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

function runCommand(command) {
  const isWindows = process.platform === "win32";
  const shell = isWindows
    ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    : "/bin/bash";
  const wrapped = isWindows
    ? `-NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`
    : `-lc ${JSON.stringify(command)}`;

  return new Promise((resolve) => {
    exec(`${JSON.stringify(shell)} ${wrapped}`, {
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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        name: "OCNE Local Agent",
        version: VERSION,
        platform: process.platform,
        arch: os.arch(),
        hostname: os.hostname(),
        workspace: WORKSPACE,
        approvalMode: APPROVAL_MODE,
        tokenRequired: true,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/run") {
      if (!requireToken(req, res)) return;
      const body = await readBody(req);
      const command = String(body.command || "").trim();

      if (!command) {
        sendJson(res, 400, { ok: false, error: "Command is required" });
        return;
      }
      if (command.length > 4000) {
        sendJson(res, 400, { ok: false, error: "Command is too long" });
        return;
      }

      const approved = APPROVAL_MODE === "terminal" ? await askApproval(command) : hasWebApproval(body);
      if (!approved) {
        sendJson(res, 403, {
          ok: false,
          error: APPROVAL_MODE === "terminal"
            ? "Command denied on the local computer"
            : "Type APPROVE in the website before sending this command",
        });
        return;
      }

      const result = await runCommand(command);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : "Unknown agent error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("==============================================");
  console.log("OCNE Local Agent is running");
  console.log(`URL:   http://127.0.0.1:${PORT}`);
  console.log(`Token: ${TOKEN}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Approval: ${APPROVAL_MODE === "terminal" ? "terminal prompt" : "website APPROVE field"}`);
  console.log("Keep this window open while using OCNE Agent.");
  console.log(APPROVAL_MODE === "terminal"
    ? "Commands require approval here before they run."
    : "Commands require APPROVE in the website before they run.");
  console.log("==============================================");
});
