export type OperationStatus = "idle" | "running" | "success" | "warning" | "error" | "blocked";

export type ApkSignatureStatus = "v1" | "v2+" | "v1+v2+" | "unsigned" | "unknown";

export type ApkAnalysis = {
  validZip: boolean;
  hasManifest: boolean;
  hasResources: boolean;
  dexCount: number;
  entryCount: number;
  signature: ApkSignatureStatus;
  manifestType: "binary" | "xml" | "missing" | "unknown";
  warnings: string[];
  errors: string[];
};

export type ImportedApk = {
  name: string;
  uri: string;
  size: number;
  sha256: string;
  importedAt: string;
  analysis: ApkAnalysis;
};

export type ProcessingRecord = {
  id: string;
  operation: "analyze" | "protect" | "sign" | "build" | "download" | "install" | "update";
  status: OperationStatus;
  label: string;
  message: string;
  createdAt: string;
  sha256?: string;
  artifactUri?: string;
  jobId?: string;
};

export type GithubRelease = {
  id: number;
  tag_name: string;
  name: string;
  body: string | null;
  published_at: string | null;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
  assets: Array<{
    id: number;
    name: string;
    browser_download_url: string;
    size: number;
    digest?: string | null;
  }>;
};

export type WorkerConfig = {
  endpoint: string;
  token?: string;
};

export type GithubConfig = {
  owner: string;
  repo: string;
};
