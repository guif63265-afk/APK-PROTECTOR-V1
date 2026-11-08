import { Platform } from "react-native";
import { File, Paths, UploadType } from "expo-file-system";
import type { WorkerConfig } from "./types";

export type WorkerOperation = "protect" | "sign" | "build";

export type WorkerJobResponse = {
  jobId: string;
  status: "queued" | "running" | "success" | "error";
  message?: string;
  artifactUrl?: string;
  sha256?: string;
  signature?: string;
  logs?: string[];
};

export async function submitWorkerJob(
  config: WorkerConfig,
  operation: WorkerOperation,
  fileUri: string,
  sha256: string,
): Promise<WorkerJobResponse> {
  if (Platform.OS === "web") {
    throw new Error("O worker nativo não pode ser chamado pelo Web Preview; use um build Android.");
  }
  const endpoint = config.endpoint.trim().replace(/\/$/, "");
  if (!endpoint) throw new Error("Worker não configurado. Informe um endpoint nativo nas Configurações.");
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error("O endpoint do Worker deve usar HTTPS.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTPS")) throw error;
    throw new Error("Endpoint do Worker inválido. Use uma URL HTTPS completa.");
  }
  if (!config.token?.trim()) throw new Error("Worker configurado, mas o token obrigatório não foi informado nas Configurações.");

  let healthResponse: Response;
  try {
    healthResponse = await fetch(`${endpoint}/health`, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Worker indisponível: não foi possível conectar ao endpoint configurado.");
  }
  if (!healthResponse.ok) throw new Error(`Worker indisponível: endpoint respondeu HTTP ${healthResponse.status}.`);

  let response: Awaited<ReturnType<File["upload"]>>;
  try {
    response = await new File(fileUri).upload(`${endpoint}/api/v1/jobs`, {
      fieldName: "apk",
      httpMethod: "POST",
      uploadType: UploadType.MULTIPART,
      parameters: { operation, sha256 },
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
      },
    });
  } catch {
    throw new Error("Worker indisponível: falha no upload do APK para o endpoint configurado.");
  }
  if (response.status < 200 || response.status >= 300) {
    let detail = "";
    try { detail = (JSON.parse(response.body) as { message?: string }).message ?? ""; } catch { /* resposta não JSON */ }
    throw new Error(detail || `Worker respondeu com HTTP ${response.status}.`);
  }
  let body: WorkerJobResponse;
  try { body = JSON.parse(response.body) as WorkerJobResponse; } catch { throw new Error("Worker retornou uma resposta inválida ao criar o job."); }
  if (!body.jobId) throw new Error("O worker não retornou um jobId válido.");
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const statusResponse = await fetch(`${endpoint}/api/v1/jobs/${body.jobId}`, { headers: { Accept: "application/json", ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}) } });
    if (!statusResponse.ok) throw new Error(`Worker respondeu com HTTP ${statusResponse.status} ao consultar o job.`);
    const current = (await statusResponse.json()) as WorkerJobResponse;
    if (current.status === "error") throw new Error(current.message ?? "O worker recusou o job.");
    if (current.status === "success") {
      if (!current.artifactUrl) return current;
      const artifactUrl = current.artifactUrl.startsWith("http") ? current.artifactUrl : `${endpoint}${current.artifactUrl}`;
      const download = await File.downloadFileAsync(artifactUrl, new File(Paths.cache, `worker-${body.jobId}.apk`), { idempotent: true, headers: config.token ? { Authorization: `Bearer ${config.token}` } : undefined });
      return { ...current, artifactUrl: download.uri };
    }
  }
  throw new Error("O worker não concluiu o job em 2 minutos.");
}
