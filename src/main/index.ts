import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { copyText, openExternal, revealPath, stopProcess } from "./actions";
import { getPreferences, updatePreferences } from "./preferences";
import { scanWindowsPorts } from "./scanner";

function getWindowIconPath(): string {
  const packagedIconPath = join(process.resourcesPath, "icon.png");
  if (app.isPackaged && existsSync(packagedIconPath)) {
    return packagedIconPath;
  }

  return join(app.getAppPath(), "build/icon.png");
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 1024,
    minWidth: 1120,
    minHeight: 760,
    title: "PortWarden",
    autoHideMenuBar: true,
    backgroundColor: "#0b1016",
    icon: getWindowIconPath(),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.setMenu(null);

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(() => {
  ipcMain.handle("portwarden:scanPorts", scanWindowsPorts);
  ipcMain.handle("portwarden:stopProcess", (_event, pid, options) => stopProcess(pid, options));
  ipcMain.handle("portwarden:openExternal", (_event, url) => openExternal(url));
  ipcMain.handle("portwarden:revealPath", (_event, path) => revealPath(path));
  ipcMain.handle("portwarden:copyText", (_event, text) => copyText(text));
  ipcMain.handle("portwarden:getPreferences", getPreferences);
  ipcMain.handle("portwarden:updatePreferences", (_event, patch) => updatePreferences(patch));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
