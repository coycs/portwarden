import { describe, expect, it } from "vitest";
import { normalizeScan, SCAN_SCRIPT } from "../src/main/scanner";

describe("normalizeScan", () => {
  it("does not overwrite PowerShell's built-in PID variable", () => {
    expect(SCAN_SCRIPT).not.toContain("foreach ($pid in");
    expect(SCAN_SCRIPT).toContain("foreach ($processId in");
  });

  it("maps PowerShell scan output into port/process records", () => {
    const records = normalizeScan(
      {
        connections: {
          LocalAddress: "127.0.0.1",
          LocalPort: 5173,
          State: "Listen",
          OwningProcess: 1234,
        },
        processes: {
          ProcessId: 1234,
          Name: "node.exe",
          CommandLine: "node vite.js --token abc",
          ExecutablePath: "C:\\Program Files\\nodejs\\node.exe",
          ParentProcessId: 100,
          CreationDate: "2026-07-15T10:00:00.000Z",
          CPU: 10,
          WorkingSet64: 104857600,
        },
      },
      "2026-07-15T11:00:00.000Z",
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.port.port).toBe(5173);
    expect(records[0]?.process?.name).toBe("node.exe");
    expect(records[0]?.process?.commandLine).toContain("--token ********");
    expect(records[0]?.process?.memoryBytes).toBe(104857600);
  });

  it("normalizes numeric TCP listen state from Windows APIs", () => {
    const records = normalizeScan(
      {
        connections: {
          LocalAddress: "0.0.0.0",
          LocalPort: 8080,
          State: 2,
          OwningProcess: 2468,
        },
      },
      "2026-07-15T11:00:00.000Z",
    );

    expect(records[0]?.port.state).toBe("Listen");
  });

  it("computes CPU percent from the second sample", () => {
    normalizeScan(
      {
        connections: {
          LocalAddress: "127.0.0.1",
          LocalPort: 3000,
          State: "Listen",
          OwningProcess: 5678,
        },
        processes: { ProcessId: 5678, Name: "node.exe", CPU: 1, WorkingSet64: 1 },
      },
      "2026-07-15T11:00:00.000Z",
    );

    const records = normalizeScan(
      {
        connections: {
          LocalAddress: "127.0.0.1",
          LocalPort: 3000,
          State: "Listen",
          OwningProcess: 5678,
        },
        processes: { ProcessId: 5678, Name: "node.exe", CPU: 2, WorkingSet64: 1 },
      },
      "2026-07-15T11:00:01.000Z",
    );

    expect(records[0]?.process?.cpuPercent).toBeGreaterThanOrEqual(0);
  });
});
