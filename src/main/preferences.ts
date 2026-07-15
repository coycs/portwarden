import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { UserPreferences } from "../shared/types";

const DEFAULT_PREFERENCES: UserPreferences = {
  autoRefresh: true,
  refreshIntervalMs: 5000,
  locale: "zh-CN",
  themeMode: "system",
};

function preferencesPath(): string {
  return join(app.getPath("userData"), "preferences.json");
}

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const content = await readFile(preferencesPath(), "utf8");
    return normalizePreferences(JSON.parse(content) as Partial<UserPreferences>);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const next = normalizePreferences({
    ...(await getPreferences()),
    ...patch,
  });

  const filePath = preferencesPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  return next;
}

function normalizePreferences(value: Partial<UserPreferences>): UserPreferences {
  return {
    autoRefresh:
      typeof value.autoRefresh === "boolean" ? value.autoRefresh : DEFAULT_PREFERENCES.autoRefresh,
    refreshIntervalMs:
      typeof value.refreshIntervalMs === "number" && value.refreshIntervalMs >= 1000
        ? value.refreshIntervalMs
        : DEFAULT_PREFERENCES.refreshIntervalMs,
    locale: value.locale === "en-US" ? "en-US" : "zh-CN",
    themeMode:
      value.themeMode === "light" || value.themeMode === "dark" ? value.themeMode : "system",
  };
}
