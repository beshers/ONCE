const website = document.getElementById("website");
const connectionStatus = document.getElementById("connectionStatus");
const localBridge = document.getElementById("localBridge");
const computer = document.getElementById("computer");
const version = document.getElementById("version");
const access = document.getElementById("access");
const token = document.getElementById("token");
const autoStart = document.getElementById("autoStart");
const updates = document.getElementById("updates");
const checkUpdates = document.getElementById("checkUpdates");
const openWebsite = document.getElementById("openWebsite");
const allowAllFiles = document.getElementById("allowAllFiles");
const workspace = document.getElementById("workspace");
const save = document.getElementById("save");

function render(status) {
  website.textContent = status.websiteUrl || "https://ocne.onrender.com";
  connectionStatus.textContent = status.connectionStatus || "Ready for OCNE Website";
  localBridge.textContent = status.localBridgeUrl || status.url;
  computer.textContent = `${status.hostname} (${status.platform} / ${status.arch})`;
  version.textContent = status.version;
  access.textContent = status.allowAllFiles ? "All user-accessible files and drives" : status.workspace;
  token.textContent = status.token;
  autoStart.checked = status.autoStart;
  updates.textContent = status.updateStatus;
  allowAllFiles.checked = status.allowAllFiles;
  workspace.value = status.workspace || "";
}

save.addEventListener("click", async () => {
  const status = await window.ocneAgent.setConfig({
    allowAllFiles: allowAllFiles.checked,
    autoStart: autoStart.checked,
    workspace: workspace.value,
  });
  render(status);
});

checkUpdates.addEventListener("click", async () => {
  updates.textContent = "Checking for updates...";
  const status = await window.ocneAgent.checkUpdates();
  render(status);
});

openWebsite.addEventListener("click", async () => {
  await window.ocneAgent.openWebsite();
});

window.ocneAgent.onStatus(render);
window.ocneAgent.getStatus().then(render);
