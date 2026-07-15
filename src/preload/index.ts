import { contextBridge, ipcRenderer } from "electron";
import type {
  ActionResult,
  ScanResult,
  StopProcessOptions,
  UserPreferences,
} from "../shared/types";

const api = {
  scanPorts: (): Promise<ScanResult> => ipcRenderer.invoke("portwarden:scanPorts"),
  stopProcess: (pid: number, options?: StopProcessOptions): Promise<ActionResult> =>
    ipcRenderer.invoke("portwarden:stopProcess", pid, options),
  openExternal: (url: string): Promise<ActionResult> =>
    ipcRenderer.invoke("portwarden:openExternal", url),
  revealPath: (path: string): Promise<ActionResult> =>
    ipcRenderer.invoke("portwarden:revealPath", path),
  copyText: (text: string): Promise<ActionResult> =>
    ipcRenderer.invoke("portwarden:copyText", text),
  getPreferences: (): Promise<UserPreferences> => ipcRenderer.invoke("portwarden:getPreferences"),
  updatePreferences: (patch: Partial<UserPreferences>): Promise<UserPreferences> =>
    ipcRenderer.invoke("portwarden:updatePreferences", patch),
};

contextBridge.exposeInMainWorld("portwarden", api);
