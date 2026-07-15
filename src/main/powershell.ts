import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function assertPowerShell7(): Promise<void> {
  try {
    const { stdout } = await execFileAsync(
      "pwsh",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.Major"],
      { windowsHide: true, timeout: 5000 },
    );

    const major = Number(stdout.trim());
    if (!Number.isFinite(major) || major < 7) {
      throw new Error("PowerShell 7 is required.");
    }
  } catch (error) {
    throw new Error(
      `PortWarden requires PowerShell 7 (pwsh) to scan Windows ports. ${error instanceof Error ? error.message : ""}`,
    );
  }
}

export async function runPowerShellJson<T>(script: string): Promise<T> {
  await assertPowerShell7();

  const { stdout } = await execFileAsync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
      timeout: 15000,
    },
  );

  return JSON.parse(stdout) as T;
}
