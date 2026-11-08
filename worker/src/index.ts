import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import multer from "multer";

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.WORKER_TOKEN ?? "";
const ROOT = process.env.WORKER_TMP ?? "/tmp/apk-protector-jobs";
const upload = multer({ dest: path.join(ROOT, "uploads"), limits: { fileSize: 250 * 1024 * 1024 } });
const jobs = new Map<string, { status: "queued" | "running" | "success" | "error"; message: string; artifactUrl?: string; sha256?: string; logs: string[] }>();

function authorized(request: express.Request) {
  if (!TOKEN) return false;
  return request.header("authorization") === `Bearer ${TOKEN}`;
}

async function runScript(operation: string, input: string, jobDir: string) {
  const output = path.join(jobDir, "output.apk");
  const logPath = path.join(jobDir, "worker.log");
  const args = ["worker/scripts/process-apk.sh", operation, input, output];
  const lines: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const child = spawn("bash", args, { cwd: process.cwd(), env: process.env });
    child.stdout.on("data", (chunk) => lines.push(String(chunk)));
    child.stderr.on("data", (chunk) => lines.push(String(chunk)));
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(lines.join("").trim() || `process-apk.sh terminou com código ${code}`)));
  });
  await fs.writeFile(logPath, lines.join(""), "utf8");
  const digest = await new Promise<string>((resolve, reject) => { const hash = crypto.createHash("sha256"); const stream = createReadStream(output); stream.on("data", (chunk) => hash.update(chunk)); stream.on("end", () => resolve(hash.digest("hex"))); stream.on("error", reject); });
  return { output, digest, logs: lines };
}

const app = express();
app.get("/health", (_request, response) => response.json({ ok: true, service: "apk-protector-worker" }));
app.post("/api/v1/jobs", upload.single("apk"), async (request, response) => {
  if (!authorized(request)) return response.status(401).json({ message: "Worker token inválido." });
  if (!request.file) return response.status(400).json({ message: "Campo multipart apk ausente." });
  const operation = String(request.body.operation ?? "");
  if (!["protect", "sign", "build"].includes(operation)) return response.status(400).json({ message: "Operação não suportada." });
  const jobId = crypto.randomUUID();
  const jobDir = path.join(ROOT, jobId);
  await fs.mkdir(jobDir, { recursive: true });
  const input = path.join(jobDir, "input.apk");
  await fs.rename(request.file.path, input);
  jobs.set(jobId, { status: "queued", message: "Job recebido; aguardando ferramentas Android.", logs: [] });
  void (async () => {
    jobs.set(jobId, { status: "running", message: "Processando com Android SDK/Build Tools.", logs: [] });
    try {
      const result = await runScript(operation, input, jobDir);
      jobs.set(jobId, { status: "success", message: "Artefato validado pelo worker.", artifactUrl: `/api/v1/jobs/${jobId}/artifact`, sha256: result.digest, logs: result.logs });
    } catch (error) {
      jobs.set(jobId, { status: "error", message: error instanceof Error ? error.message : "Falha no worker.", logs: [] });
    }
  })();
  return response.status(202).json({ jobId, status: "queued", message: "Job recebido." });
});
app.get("/api/v1/jobs/:jobId", (request, response) => {
  if (!authorized(request)) return response.status(401).json({ message: "Worker token inválido." });
  const job = jobs.get(request.params.jobId);
  if (!job) return response.status(404).json({ message: "Job não encontrado." });
  return response.json({ jobId: request.params.jobId, ...job });
});
app.get("/api/v1/jobs/:jobId/artifact", async (request, response) => {
  if (!authorized(request)) return response.status(401).send("Worker token inválido.");
  const artifact = path.join(ROOT, request.params.jobId, "output.apk");
  try { await fs.access(artifact); return response.download(artifact, "apk-protector-output.apk"); } catch { return response.status(404).send("Artefato ainda não disponível."); }
});
app.listen(PORT, () => console.log(`APK Protector worker listening on ${PORT}`));
