import { describe, expect, it } from "vitest";
import { detectService } from "../src/shared/service-detection";

describe("detectService", () => {
  it("detects Vite development servers", () => {
    const service = detectService({
      port: {
        id: "tcp-127.0.0.1-5173-1",
        protocol: "TCP",
        localAddress: "127.0.0.1",
        port: 5173,
        state: "Listen",
        pid: 1,
        detectedAt: "2026-07-15T11:00:00.000Z",
      },
      process: {
        pid: 1,
        name: "node.exe",
        commandLine: "node node_modules/vite/bin/vite.js",
      },
    });

    expect(service.framework).toBe("Vite");
    expect(service.type).toBe("DEV SERVER");
    expect(service.risk).toBe("Low");
  });

  it("marks databases exposed on all interfaces as high risk", () => {
    const service = detectService({
      port: {
        id: "tcp-0.0.0.0-5432-2",
        protocol: "TCP",
        localAddress: "0.0.0.0",
        port: 5432,
        state: "Listen",
        pid: 2,
        detectedAt: "2026-07-15T11:00:00.000Z",
      },
      process: {
        pid: 2,
        name: "postgres.exe",
      },
    });

    expect(service.framework).toBe("PostgreSQL");
    expect(service.risk).toBe("High");
  });
});
