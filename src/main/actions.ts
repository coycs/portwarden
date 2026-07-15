import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clipboard, shell } from "electron";
import type { ActionResult, StopProcessOptions } from "../shared/types";
import { normalizeTaskkillError } from "./taskkill-error";

const execFileAsync = promisify(execFile);

export async function stopProcess(pid: unknown, options: unknown = {}): Promise<ActionResult> {
  if (!Number.isInteger(pid) || Number(pid) <= 0) {
    return {
      ok: false,
      errorCode: "INVALID_PID",
      message: "PID must be a positive integer.",
    };
  }

  const force = isStopProcessOptions(options) ? options.force === true : false;
  const args = ["/PID", String(pid)];
  if (force) {
    args.push("/F");
  }

  try {
    await execFileAsync("taskkill", args, {
      windowsHide: true,
      timeout: 10000,
      encoding: "buffer",
    });

    return { ok: true };
  } catch (error) {
    const failure = normalizeTaskkillError(error);
    return {
      ok: false,
      errorCode: failure.errorCode,
      message: failure.message,
    };
  }
}

function isStopProcessOptions(value: unknown): value is StopProcessOptions {
  return typeof value === "object" && value !== null;
}

export async function openExternal(url: unknown): Promise<ActionResult> {
  if (
    typeof url !== "string" ||
    !/^https?:\/\/|^http:\/\/localhost|^http:\/\/127\.0\.0\.1/.test(url)
  ) {
    return {
      ok: false,
      errorCode: "INVALID_URL",
      message: "URL must be a non-empty HTTP URL.",
    };
  }

  await shell.openExternal(url);
  return { ok: true };
}

export async function revealPath(path: unknown): Promise<ActionResult> {
  if (typeof path !== "string" || path.trim().length === 0) {
    return {
      ok: false,
      errorCode: "INVALID_PATH",
      message: "Path must be a non-empty string.",
    };
  }

  const result = await shell.openPath(path);
  return result ? { ok: false, errorCode: "OPEN_PATH_FAILED", message: result } : { ok: true };
}

export async function copyText(text: unknown): Promise<ActionResult> {
  if (typeof text !== "string" || text.length === 0) {
    return {
      ok: false,
      errorCode: "INVALID_TEXT",
      message: "Text must be a non-empty string.",
    };
  }

  clipboard.writeText(text);
  return { ok: true };
}
