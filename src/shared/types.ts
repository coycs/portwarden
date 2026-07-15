export type Locale = "zh-CN" | "en-US";

export type ThemeMode = "system" | "dark" | "light";

export type RiskLevel = "Low" | "Medium" | "High";

export interface PortRecord {
  id: string;
  protocol: "TCP";
  localAddress: string;
  port: number;
  state: string;
  pid: number;
  detectedAt: string;
}

export interface ProcessRecord {
  pid: number;
  name: string;
  executablePath?: string;
  commandLine?: string;
  parentPid?: number;
  startedAt?: string;
  cpuPercent?: number;
  memoryBytes?: number;
}

export interface PortProcessRecord {
  port: PortRecord;
  process?: ProcessRecord;
}

export interface UserPreferences {
  autoRefresh: boolean;
  refreshIntervalMs: number;
  locale: Locale;
  themeMode: ThemeMode;
}

export interface StopProcessOptions {
  force?: boolean;
}

export type ScanResult =
  | {
      ok: true;
      records: PortProcessRecord[];
      scannedAt: string;
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
    };

export type ActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
    };

export interface ServiceRecord {
  id: string;
  port: PortRecord;
  process?: ProcessRecord;
  displayName: string;
  type: string;
  framework: string;
  tagTone: "blue" | "green" | "violet" | "amber" | "teal";
  risk: RiskLevel;
  riskNote: string;
  favorite: boolean;
}

export interface ResourceSample {
  at: number;
  cpuPercent: number;
  memoryBytes: number;
}
