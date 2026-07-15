import type { PortProcessRecord, RiskLevel, ServiceRecord } from "./types";

interface Detection {
  framework: string;
  type: string;
  tagTone: ServiceRecord["tagTone"];
}

export function detectService(record: PortProcessRecord): ServiceRecord {
  const processName = record.process?.name ?? "Unknown process";
  const haystack = [
    record.process?.name,
    record.process?.commandLine,
    record.process?.executablePath,
    record.port.port,
  ]
    .join(" ")
    .toLowerCase();

  const detection = detectFramework(haystack, record.port.port);
  const risk = detectRisk(record.port.localAddress, detection.type);

  return {
    id: record.port.id,
    port: record.port,
    process: record.process,
    displayName: detection.framework || processName,
    type: detection.type,
    framework: detection.framework,
    tagTone: detection.tagTone,
    risk,
    riskNote:
      risk === "Low" ? "Bound to localhost only" : "Review network exposure and dependencies",
    favorite: false,
  };
}

function detectFramework(haystack: string, port: number): Detection {
  if (haystack.includes("vite")) return { framework: "Vite", type: "DEV SERVER", tagTone: "blue" };
  if (haystack.includes("next"))
    return { framework: "Next.js", type: "DEV SERVER", tagTone: "blue" };
  if (haystack.includes("webpack"))
    return { framework: "Webpack", type: "DEV SERVER", tagTone: "blue" };
  if (haystack.includes("postgres") || port === 5432)
    return { framework: "PostgreSQL", type: "DATABASE", tagTone: "green" };
  if (haystack.includes("redis") || port === 6379)
    return { framework: "Redis", type: "DATABASE", tagTone: "green" };
  if (haystack.includes("spring") || haystack.includes("java"))
    return { framework: "Spring Boot", type: "WEB", tagTone: "violet" };
  if (haystack.includes("fastapi") || haystack.includes("uvicorn"))
    return { framework: "FastAPI", type: "WEB", tagTone: "teal" };
  if (haystack.includes("inspect") || port === 9229)
    return { framework: "Node Inspector", type: "DEV TOOLS", tagTone: "amber" };
  if (haystack.includes("node"))
    return { framework: "Node.js", type: "DEV SERVER", tagTone: "blue" };
  if (haystack.includes("python")) return { framework: "Python", type: "WEB", tagTone: "teal" };
  return { framework: "Local Service", type: "SERVICE", tagTone: "violet" };
}

function detectRisk(address: string, type: string): RiskLevel {
  const host = address.split(":")[0] ?? "";

  if (host === "0.0.0.0" || host === "::") {
    return type === "DATABASE" ? "High" : "Medium";
  }

  if (type === "DATABASE") {
    return "Medium";
  }

  return "Low";
}
