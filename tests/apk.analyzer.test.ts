import { describe, expect, it } from "vitest";
import { formatBytes, shortHash } from "../lib/apk/presentation";

describe("APK analyzer helpers", () => {
  it("formata tamanhos de forma legível", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });

  it("encurta digests sem perder prefixo e sufixo", () => {
    const digest = "a".repeat(64);
    expect(shortHash(digest)).toBe("aaaaaaaaaa…aaaaaaaa");
  });

});
