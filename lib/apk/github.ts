import type { GithubConfig, GithubRelease } from "./types";

export function normalizeGithubConfig(config: GithubConfig): GithubConfig {
  return {
    owner: config.owner.trim(),
    repo: config.repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, ""),
  };
}

function assertConfig(config: GithubConfig): GithubConfig {
  const normalized = normalizeGithubConfig(config);
  if (!normalized.owner || !normalized.repo) {
    throw new Error("Configure o proprietário e o repositório do GitHub antes de verificar atualizações.");
  }
  return normalized;
}

export async function fetchGithubReleases(config: GithubConfig): Promise<GithubRelease[]> {
  const normalized = assertConfig(config);
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(normalized.owner)}/${encodeURIComponent(normalized.repo)}/releases?per_page=20`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repositório ou Releases não encontrados. Verifique a configuração do GitHub.");
    throw new Error(`GitHub respondeu com HTTP ${response.status}.`);
  }
  return (await response.json()) as GithubRelease[];
}

export function releaseVersion(release: GithubRelease): string {
  return (release.tag_name || release.name || "").replace(/^v/i, "").trim();
}

export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => value.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function releaseSha256(release: GithubRelease): string | null {
  const apk = release.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
  const digest = apk?.digest?.match(/sha256:([a-f0-9]{64})/i)?.[1];
  if (digest) return digest.toLowerCase();
  const bodyDigest = release.body?.match(/(?:APK_SHA256|SHA256)\s*[:=]\s*([a-f0-9]{64})/i)?.[1];
  return bodyDigest?.toLowerCase() ?? null;
}

export function releaseApk(release: GithubRelease) {
  return release.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk")) ?? null;
}
