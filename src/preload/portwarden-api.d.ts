import type {
  ActionResult,
  ScanResult,
  StopProcessOptions,
  UserPreferences,
} from "../shared/types";

export interface PortWardenApi {
  scanPorts(): Promise<ScanResult>;
  stopProcess(pid: number, options?: StopProcessOptions): Promise<ActionResult>;
  openExternal(url: string): Promise<ActionResult>;
  revealPath(path: string): Promise<ActionResult>;
  copyText(text: string): Promise<ActionResult>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences>;
}

declare global {
  interface Window {
    portwarden: PortWardenApi;
  }
}
