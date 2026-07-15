import { describe, expect, it } from "vitest";
import { maskSensitiveCommand } from "../src/shared/sanitize";

describe("maskSensitiveCommand", () => {
  it("masks common key-value secrets", () => {
    expect(maskSensitiveCommand("node server.js --token abc password=secret api_key=xyz")).toBe(
      "node server.js --token ******** password=******** api_key=********",
    );
  });

  it("preserves non-sensitive command text", () => {
    expect(maskSensitiveCommand("pnpm dev --port 5173")).toBe("pnpm dev --port 5173");
  });
});
