const url = document.getElementById("url");
const computer = document.getElementById("computer");
const version = document.getElementById("version");
const access = document.getElementById("access");
const token = document.getElementById("token");
const autoStart = document.getElementById("autoStart");
const updates = document.getElementById("updates");
const checkUpdates = document.getElementById("checkUpdates");
const allowAllFiles = document.getElementById("allowAllFiles");
const workspace = document.getElementById("workspace");
const save = document.getElementById("save");

function render(status) {
  url.textContent = status.url;
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

window.ocneAgent.onStatus(render);
window.ocneAgent.getStatus().then(render);
