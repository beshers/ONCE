const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ocneAgent", {
  getStatus: () => ipcRenderer.invoke("agent:get-status"),
  setConfig: (config) => ipcRenderer.invoke("agent:set-config", config),
  onStatus: (callback) => {
    ipcRenderer.on("agent-status", (_event, status) => callback(status));
  },
});
