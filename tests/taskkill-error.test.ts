import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { normalizeTaskkillError } from "../src/main/taskkill-error";

describe("normalizeTaskkillError", () => {
  it("classifies force-required taskkill failures", () => {
    const failure = normalizeTaskkillError({
      stderr: Buffer.from(
        "错误: 无法终止 PID 为 4064 的进程。原因: 只能强制终止这个进程(带 /F 选项)。",
        "utf8",
      ),
    });

    expect(failure.errorCode).toBe("STOP_REQUIRES_FORCE");
    expect(failure.message).toContain("只能使用 /F 强制结束");
  });

  it("decodes gb18030 taskkill output", () => {
    const failure = normalizeTaskkillError({
      stderr: Buffer.from([
        180, 237, 206, 243, 58, 32, 190, 220, 190, 248, 183, 195, 206, 202, 161, 163,
      ]),
    });

    expect(failure.errorCode).toBe("ACCESS_DENIED");
    expect(failure.message).toContain("权限不足");
  });

  it("classifies missing processes", () => {
    const failure = normalizeTaskkillError({
      stderr: 'ERROR: The process "999999" not found.',
    });

    expect(failure.errorCode).toBe("PROCESS_NOT_FOUND");
  });
});
