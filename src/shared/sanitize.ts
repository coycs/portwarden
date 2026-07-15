const SENSITIVE_KEYS = [
  "access_token",
  "api_key",
  "apikey",
  "password",
  "passwd",
  "secret",
  "token",
  "key",
];

const VALUE_PATTERN = String.raw`(?:"[^"]*"|'[^']*'|[^\s"';&|]+)`;

export function maskSensitiveCommand(commandLine?: string): string | undefined {
  if (!commandLine) {
    return commandLine;
  }

  let masked = commandLine;

  for (const key of SENSITIVE_KEYS) {
    const assignment = new RegExp(`(${key}\\s*=\\s*)${VALUE_PATTERN}`, "gi");
    const cliEquals = new RegExp(`(--?${key}\\s*=\\s*)${VALUE_PATTERN}`, "gi");
    const cliSpace = new RegExp(`(--?${key}\\s+)${VALUE_PATTERN}`, "gi");

    masked = masked
      .replace(assignment, "$1********")
      .replace(cliEquals, "$1********")
      .replace(cliSpace, "$1********");
  }

  return masked;
}
