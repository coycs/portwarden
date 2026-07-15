import { maskSensitiveCommand } from "../shared/sanitize";
import type { PortProcessRecord, PortRecord, ProcessRecord, ScanResult } from "../shared/types";
import { runPowerShellJson } from "./powershell";

interface RawConnection {
  LocalAddress: string;
  LocalPort: number;
  State: string | number;
  OwningProcess: number;
}

interface RawProcess {
  ProcessId: number;
  Name?: string | null;
  ExecutablePath?: string | null;
  CommandLine?: string | null;
  ParentProcessId?: number | null;
  CreationDate?: string | null;
  CPU?: number | null;
  WorkingSet64?: number | null;
}

interface RawScan {
  connections?: RawConnection[] | RawConnection;
  processes?: RawProcess[] | RawProcess;
}

interface CpuSnapshot {
  cpuSeconds: number;
  sampledAt: number;
}

const cpuSnapshots = new Map<number, CpuSnapshot>();

export const SCAN_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$connections = @(Get-NetTCPConnection -State Listen | ForEach-Object {
  [PSCustomObject]@{
    LocalAddress = $_.LocalAddress
    LocalPort = $_.LocalPort
    State = $_.State.ToString()
    OwningProcess = $_.OwningProcess
  }
})
$pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 })
$processes = @()
foreach ($processId in $pids) {
  $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  $gp = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($cim -ne $null) {
    $processes += [PSCustomObject]@{
      ProcessId = [int]$processId
      Name = $cim.Name
      ExecutablePath = $cim.ExecutablePath
      CommandLine = $cim.CommandLine
      ParentProcessId = $cim.ParentProcessId
      CreationDate = if ($cim.CreationDate) { $cim.CreationDate.ToString('o') } else { $null }
      CPU = if ($gp) { $gp.CPU } else { $null }
      WorkingSet64 = if ($gp) { $gp.WorkingSet64 } else { $null }
    }
  }
}
[PSCustomObject]@{
  connections = $connections
  processes = $processes
} | ConvertTo-Json -Depth 6 -Compress
`;

export async function scanWindowsPorts(): Promise<ScanResult> {
  if (process.platform !== "win32") {
    return {
      ok: false,
      errorCode: "UNSUPPORTED_PLATFORM",
      message: "PortWarden currently supports Windows only.",
    };
  }

  try {
    const raw = await runPowerShellJson<RawScan>(SCAN_SCRIPT);
    const scannedAt = new Date().toISOString();
    const records = normalizeScan(raw, scannedAt);

    return {
      ok: true,
      records,
      scannedAt,
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: "SCAN_FAILED",
      message: error instanceof Error ? error.message : "Failed to scan Windows ports.",
    };
  }
}

export function normalizeScan(raw: RawScan, scannedAt: string): PortProcessRecord[] {
  const connections = toArray(raw.connections);
  const processes = new Map<number, ProcessRecord>();

  for (const rawProcess of toArray(raw.processes)) {
    const processRecord = normalizeProcess(rawProcess);
    processes.set(processRecord.pid, processRecord);
  }

  const activePids = new Set(connections.map((connection) => Number(connection.OwningProcess)));
  for (const pid of cpuSnapshots.keys()) {
    if (!activePids.has(pid)) {
      cpuSnapshots.delete(pid);
    }
  }

  return connections
    .filter((connection) => Number.isFinite(Number(connection.LocalPort)))
    .map((connection) => {
      const pid = Number(connection.OwningProcess);
      const localAddress = String(connection.LocalAddress ?? "");
      const port = Number(connection.LocalPort);
      const portRecord: PortRecord = {
        id: `tcp-${localAddress}-${port}-${pid}`,
        protocol: "TCP",
        localAddress,
        port,
        state: normalizeConnectionState(connection.State),
        pid,
        detectedAt: scannedAt,
      };

      return {
        port: portRecord,
        process: processes.get(pid),
      };
    })
    .sort((left, right) => left.port.port - right.port.port);
}

function normalizeProcess(raw: RawProcess): ProcessRecord {
  const pid = Number(raw.ProcessId);
  const now = Date.now();
  const cpuSeconds = raw.CPU == null ? undefined : Number(raw.CPU);
  const previous = cpuSnapshots.get(pid);
  let cpuPercent: number | undefined;

  if (cpuSeconds !== undefined && previous) {
    const elapsedSeconds = Math.max((now - previous.sampledAt) / 1000, 0.001);
    const delta = Math.max(cpuSeconds - previous.cpuSeconds, 0);
    cpuPercent = Number(((delta / elapsedSeconds) * 100).toFixed(1));
  }

  if (cpuSeconds !== undefined) {
    cpuSnapshots.set(pid, { cpuSeconds, sampledAt: now });
  }

  return {
    pid,
    name: raw.Name ?? `PID ${pid}`,
    executablePath: raw.ExecutablePath ?? undefined,
    commandLine: maskSensitiveCommand(raw.CommandLine ?? undefined),
    parentPid: raw.ParentProcessId ?? undefined,
    startedAt: raw.CreationDate ?? undefined,
    cpuPercent,
    memoryBytes: raw.WorkingSet64 == null ? undefined : Number(raw.WorkingSet64),
  };
}

function toArray<T>(value: T[] | T | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeConnectionState(state: string | number | undefined): string {
  if (state === 2) {
    return "Listen";
  }

  return String(state ?? "Listen");
}
