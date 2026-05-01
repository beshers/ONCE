const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const http = require("node:http");
const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const VERSION = "0.1.0";
const HOST = "127.0.0.1";
const PORT = Number(process.env.OCNE_DESKTOP_AGENT_PORT || 48731);
const OCNE_WEBSITE_URL = process.env.OCNE_WEBSITE_URL || "https://ocne.onrender.com";
const TOKEN = process.env.OCNE_DESKTOP_AGENT_TOKEN || crypto.randomBytes(18).toString("hex");
const ALLOWED_ORIGINS = new Set([
  "https://ocne.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const CONFIG_PATH = path.join(app.getPath("userData"), "agent-config.json");
const ICON_PATH = path.join(__dirname, "..", "build", process.platform === "win32" ? "icon.ico" : "icon.png");

let mainWindow;
let tray;
let server;
let config = loadConfig();
let isQuitting = false;
let updateStatus = "Updates have not been checked yet.";

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {
      allowAllFiles: false,
      autoStart: true,
      workspace: os.homedir(),
      pairedAccount: null,
    };
  }
}

function saveConfig() {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function statusPayload() {
  return {
    ok: true,
    name: "OCNE Desktop Agent",
    version: VERSION,
    websiteUrl: OCNE_WEBSITE_URL,
    connectionStatus: `Ready for ${OCNE_WEBSITE_URL}`,
    url: `http://${HOST}:${PORT}`,
    localBridgeUrl: `http://${HOST}:${PORT}`,
    port: PORT,
    platform: process.platform,
    arch: os.arch(),
    hostname: os.hostname(),
    workspace: config.allowAllFiles ? filesystemRootLabel() : config.workspace,
    allowAllFiles: config.allowAllFiles,
    autoStart: config.autoStart !== false,
    pairedAccount: config.pairedAccount,
    updateStatus,
    tokenRequired: true,
    approvalRequired: false,
    allowedOrigins: Array.from(ALLOWED_ORIGINS),
  };
}

function appIcon() {
  if (fs.existsSync(ICON_PATH)) {
    return nativeImage.createFromPath(ICON_PATH);
  }

  return nativeImage.createFromDataURL(
    "data:image/svg+xml;base64," +
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="56" fill="#0891b2"/><circle cx="64" cy="64" r="32" fill="none" stroke="#fff" stroke-width="10"/><path d="M42 86 86 42" stroke="#fff" stroke-width="12" stroke-linecap="round"/></svg>').toString("base64"),
  );
}

function filesystemRootLabel() {
  return process.platform === "win32" ? "All drives allowed by this Windows user" : "/";
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type,x-ocne-agent-token,x-ocne-user-id,x-ocne-user-email,x-ocne-user-name",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function tokenAllowed(req) {
  const candidate = String(req.headers["x-ocne-agent-token"] || "").trim();
  const expected = Buffer.from(TOKEN, "utf8");
  const actual = Buffer.from(candidate, "utf8");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function requesterFrom(req, body) {
  const bodyRequester = body && typeof body.requester === "object" ? body.requester : {};
  return {
    id: String(req.headers["x-ocne-user-id"] || bodyRequester.id || "").trim(),
    email: String(req.headers["x-ocne-user-email"] || bodyRequester.email || "").trim().toLowerCase(),
    name: String(req.headers["x-ocne-user-name"] || bodyRequester.name || "").trim(),
  };
}

function resolveShell() {
  if (process.platform === "win32") {
    return {
      command: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      argsFor: (userCommand) => ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", userCommand],
    };
  }

  return {
    command: "/bin/bash",
    argsFor: (userCommand) => ["-lc", userCommand],
  };
}

function runCommand(command) {
  const runner = resolveShell();
  return new Promise((resolve) => {
    execFile(runner.command, runner.argsFor(command), {
      cwd: config.allowAllFiles ? os.homedir() : config.workspace,
      timeout: 5 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 4,
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

function startServer() {
  server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (!originAllowed(req)) {
      sendJson(res, 403, { ok: false, code: "ORIGIN_NOT_ALLOWED", error: "This origin is not allowed to use OCNE Desktop Agent." });
      return;
    }

    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, statusPayload());
        return;
      }

      if (req.method === "POST" && url.pathname === "/run") {
        if (!tokenAllowed(req)) {
          sendJson(res, 401, { ok: false, code: "INVALID_TOKEN", error: "Invalid desktop agent pairing token." });
          return;
        }

        const body = await readBody(req);
        const command = String(body.command || "").trim();
        if (!command) {
          sendJson(res, 400, { ok: false, code: "COMMAND_REQUIRED", error: "Command is required." });
          return;
        }

        const requester = requesterFrom(req, body);
        if (requester.email || requester.id || requester.name) {
          config.pairedAccount = requester;
          saveConfig();
        }

        const result = await runCommand(command);
        sendJson(res, 200, { ...result, requester });
        updateWindow();
        return;
      }

      sendJson(res, 404, { ok: false, code: "NOT_FOUND", error: "Not found." });
    } catch (error) {
      sendJson(res, 500, { ok: false, code: "AGENT_ERROR", error: error instanceof Error ? error.message : "Unknown error." });
    }
  });

  server.listen(PORT, HOST);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    title: "OCNE Desktop Agent",
    icon: appIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "ui", "index.html"));
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(appIcon());
  tray.setToolTip("OCNE Desktop Agent");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open OCNE Desktop Agent", click: () => mainWindow?.show() },
    { label: "Open OCNE Website", click: () => shell.openExternal(`${OCNE_WEBSITE_URL}/terminal`) },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));
}

function applyAutoStart() {
  app.setLoginItemSettings({
    openAtLogin: config.autoStart !== false,
    openAsHidden: true,
  });
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => {
    updateStatus = "Checking for updates...";
    updateWindow();
  });
  autoUpdater.on("update-available", () => {
    updateStatus = "Update available. Download from the OCNE release page.";
    updateWindow();
  });
  autoUpdater.on("update-not-available", () => {
    updateStatus = "OCNE Desktop Agent is up to date.";
    updateWindow();
  });
  autoUpdater.on("error", (error) => {
    updateStatus = `Update check failed: ${error.message}`;
    updateWindow();
  });
}

function updateWindow() {
  mainWindow?.webContents.send("agent-status", { ...statusPayload(), token: TOKEN });
}

ipcMain.handle("agent:get-status", () => ({ ...statusPayload(), token: TOKEN }));
ipcMain.handle("agent:set-config", (_event, nextConfig) => {
  config = {
    ...config,
    allowAllFiles: Boolean(nextConfig.allowAllFiles),
    autoStart: Boolean(nextConfig.autoStart),
    workspace: String(nextConfig.workspace || config.workspace || os.homedir()),
  };
  saveConfig();
  applyAutoStart();
  updateWindow();
  return { ...statusPayload(), token: TOKEN };
});
ipcMain.handle("agent:check-updates", async () => {
  if (!app.isPackaged) {
    updateStatus = "Update checks run from the installed app.";
    updateWindow();
    return { ...statusPayload(), token: TOKEN };
  }

  await autoUpdater.checkForUpdates();
  return { ...statusPayload(), token: TOKEN };
});
ipcMain.handle("agent:open-website", async () => {
  await shell.openExternal(`${OCNE_WEBSITE_URL}/terminal`);
  return { ...statusPayload(), token: TOKEN };
});

app.whenReady().then(() => {
  applyAutoStart();
  configureAutoUpdater();
  startServer();
  createWindow();
  try {
    createTray();
  } catch {
    tray = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    mainWindow?.hide();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  server?.close();
});
