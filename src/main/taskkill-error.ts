import { TextDecoder } from "node:util";

interface TaskkillFailure {
  errorCode: string;
  message: string;
}

export function normalizeTaskkillError(error: unknown): TaskkillFailure {
  const output = decodeTaskkillOutput(error);
  const normalized = output.toLowerCase();

  if (output.includes("/F") || output.includes("强制") || normalized.includes("force")) {
    return {
      errorCode: "STOP_REQUIRES_FORCE",
      message: "该进程拒绝普通结束。Windows 提示只能使用 /F 强制结束。",
    };
  }

  if (output.includes("找不到") || normalized.includes("not found")) {
    return {
      errorCode: "PROCESS_NOT_FOUND",
      message: "进程可能已经退出，未能找到对应 PID。",
    };
  }

  if (
    output.includes("拒绝访问") ||
    output.includes("权限") ||
    normalized.includes("access is denied")
  ) {
    return {
      errorCode: "ACCESS_DENIED",
      message: "权限不足，Windows 拒绝结束该进程。",
    };
  }

  return {
    errorCode: "STOP_FAILED",
    message: output || "停止进程失败。",
  };
}

function decodeTaskkillOutput(error: unknown): string {
  const maybeError = error as { stdout?: unknown; stderr?: unknown; message?: unknown };
  const output = [
    decodeValue(maybeError.stderr),
    decodeValue(maybeError.stdout),
    decodeValue(maybeError.message),
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return output.replace(/\s+/g, " ");
}

function decodeValue(value: unknown): string {
  if (!value) {
    return "";
  }

  if (Buffer.isBuffer(value)) {
    return new TextDecoder("gb18030").decode(value);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Error) {
    return value.message;
  }

  return "";
}
