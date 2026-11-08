import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import express from "express";
import multer from "multer";

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.WORKER_TOKEN ?? "";
const ROOT = process.env.WORKER_TMP ?? "/tmp/apk-protector-jobs";
const MAX_APK_SIZE = 250 * 1024 * 1024;

type JobStatus = "queued" | "running" | "success" | "error";
type Job = { status: JobStatus; message: string; artifactUrl?: string; sha256?: string; logs: string[] };

class WorkerProcessError extends Error {
  constructor(message: string, readonly logs: string[]) {
    super(message);
    this.name = "WorkerProcessError";
  }
}

const upload = multer({ dest: path.join(ROOT, "uploads"), limits: { fileSize: MAX_APK_SIZE } });
const jobs = new Map<string, Job>();

function authorized(request: express.Request) {
  if (!TOKEN) return false;
  const supplied = request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(TOKEN);
  const received = Buffer.from(supplied);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function processArgs(operation: string, input: string, output: string) {
  return ["worker/scripts/process-apk.sh", operation, input, output];
}

async function runScript(operation: string, input: string, jobDir: string) {
  const output = path.join(jobDir, "output.apk");
  const logPath = path.join(jobDir, "worker.log");
  const args = processArgs(operation, input, output);
  const lines: string[] = [];
  await new Promise<void>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn("bash", args, { cwd: process.cwd(), env: process.env });
    } catch (error) {
      reject(error);
      return;
    }
    child.stdout.on("data", (chunk: Buffer) => lines.push(String(chunk)));
    child.stderr.on("data", (chunk: Buffer) => lines.push(String(chunk)));
    child.on("error", (error: Error) => reject(new WorkerProcessError(error.message, lines)));
    child.on("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new WorkerProcessError(lines.join("").trim() || `process-apk.sh terminou com código ${code}`, lines));
    });
  });
  await fs.writeFile(logPath, lines.join(""), "utf8");
  const digest = await new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(output);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
  return { output, digest, logs: lines };
}

const app = express();
app.get("/health", (_request, response) => response.json({ ok: true, service: "apk-protector-worker", authRequired: true }));

app.post("/api/v1/jobs", upload.single("apk"), async (request, response) => {
  if (!authorized(request)) return response.status(401).json({ message: "Worker token inválido ou ausente." });
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
    jobs.set(jobId, { status: "running", message: "Processando com Apktool, Android SDK/Build Tools e assinatura configurada.", logs: [] });
    try {
      const result = await runScript(operation, input, jobDir);
      jobs.set(jobId, { status: "success", message: "Artefato recompilado, assinado e validado pelo worker.", artifactUrl: `/api/v1/jobs/${jobId}/artifact`, sha256: result.digest, logs: result.logs });
    } catch (error) {
      const logs = error instanceof WorkerProcessError ? error.logs : [];
      jobs.set(jobId, { status: "error", message: error instanceof Error ? error.message : "Falha no worker.", logs });
    }
  })();
  return response.status(202).json({ jobId, status: "queued", message: "Job recebido." });
});

app.get("/api/v1/jobs/:jobId", (request, response) => {
  if (!authorized(request)) return response.status(401).json({ message: "Worker token inválido ou ausente." });
  const job = jobs.get(request.params.jobId);
  if (!job) return response.status(404).json({ message: "Job não encontrado." });
  return response.json({ jobId: request.params.jobId, ...job });
});

app.get("/api/v1/jobs/:jobId/artifact", async (request, response) => {
  if (!authorized(request)) return response.status(401).send("Worker token inválido ou ausente.");
  if (!jobs.has(request.params.jobId)) return response.status(404).send("Job não encontrado.");
  const artifact = path.join(ROOT, request.params.jobId, "output.apk");
  try {
    await fs.access(artifact);
    return response.download(artifact, "apk-protector-output.apk");
  } catch {
    return response.status(404).send("Artefato ainda não disponível.");
  }
});

async function startServer() {
  await fs.mkdir(path.join(ROOT, "uploads"), { recursive: true });
  app.listen(PORT, () => {
    console.log(`APK Protector worker listening on ${PORT}`);
    if (!TOKEN) console.error("WORKER_TOKEN não configurado; jobs serão rejeitados.");
  });
}

startServer().catch((error) => {
  console.error("Worker não iniciou:", error);
  process.exitCode = 1;
});
