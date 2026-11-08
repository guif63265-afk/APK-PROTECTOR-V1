import { describe, expect, it } from "vitest";
import { compareVersions, releaseSha256, releaseVersion } from "../lib/apk/github";

describe("GitHub release helpers", () => {
  it("compara versões sem considerar o prefixo v", () => {
    expect(compareVersions("v1.2.0".replace(/^v/, ""), "1.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
  });

  it("extrai versão e SHA-256 do corpo da release", () => {
    const digest = "a".repeat(64);
    const release = { tag_name: "v2.0.0", name: "Release", body: `APK_SHA256=${digest}`, assets: [] } as never;
    expect(releaseVersion(release)).toBe("2.0.0");
    expect(releaseSha256(release)).toBe(digest);
  });
});
