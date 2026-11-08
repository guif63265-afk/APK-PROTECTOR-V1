import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { analyzeApkAsset } from "./analyzer";
import { compareVersions, fetchGithubReleases, releaseApk, releaseSha256, releaseVersion } from "./github";
import { submitWorkerJob, type WorkerOperation } from "./worker";
import type { GithubConfig, GithubRelease, ImportedApk, OperationStatus, ProcessingRecord, WorkerConfig } from "./types";

const IMPORTED_KEY = "apk-protector:imported";
const HISTORY_KEY = "apk-protector:history";
const GITHUB_KEY = "apk-protector:github";
const WORKER_KEY = "apk-protector:worker";
const WORKER_TOKEN_KEY = "apk-protector:worker-token";
const CURRENT_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type AppContextValue = {
  importedApk: ImportedApk | null;
  history: ProcessingRecord[];
  status: OperationStatus;
  progress: number;
  github: GithubConfig;
  worker: WorkerConfig;
  latestRelease: GithubRelease | null;
  updateStatus: string;
  importApk: () => Promise<void>;
  runWorkerOperation: (operation: WorkerOperation) => Promise<void>;
  downloadLatest: () => Promise<string | null>;
  installArtifact: (uri?: string) => Promise<void>;
  saveArtifactToDownloads: (uri?: string, name?: string) => Promise<string | null>;
  checkForUpdates: () => Promise<void>;
  setGithub: (value: GithubConfig) => Promise<void>;
  setWorker: (value: WorkerConfig) => Promise<void>;
  clearImported: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

function record(operation: ProcessingRecord["operation"], status: OperationStatus, label: string, message: string, extra?: Partial<ProcessingRecord>): ProcessingRecord {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, operation, status, label, message, createdAt: new Date().toISOString(), ...extra };
}

export function ApkAppProvider({ children }: { children: ReactNode }) {
  const [importedApk, setImportedApk] = useState<ImportedApk | null>(null);
  const [history, setHistory] = useState<ProcessingRecord[]>([]);
  const [status, setStatus] = useState<OperationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [github, setGithubState] = useState<GithubConfig>({ owner: "", repo: "APK-PROTECTOR-V1" });
  const [worker, setWorkerState] = useState<WorkerConfig>({ endpoint: "", token: "" });
  const [latestRelease, setLatestRelease] = useState<GithubRelease | null>(null);
  const [updateStatus, setUpdateStatus] = useState("Nenhuma verificação realizada.");

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(IMPORTED_KEY), AsyncStorage.getItem(HISTORY_KEY), AsyncStorage.getItem(GITHUB_KEY), AsyncStorage.getItem(WORKER_KEY), SecureStore.getItemAsync(WORKER_TOKEN_KEY)])
      .then(([storedImported, storedHistory, storedGithub, storedWorker, storedToken]) => {
        if (storedImported) setImportedApk(JSON.parse(storedImported) as ImportedApk);
        if (storedHistory) setHistory(JSON.parse(storedHistory) as ProcessingRecord[]);
        if (storedGithub) setGithubState(JSON.parse(storedGithub) as GithubConfig);
        if (storedWorker) setWorkerState({ ...(JSON.parse(storedWorker) as WorkerConfig), token: storedToken ?? "" });
      })
      .catch((error) => console.warn("Falha ao restaurar o histórico local", error));
  }, []);

  const appendHistory = useCallback(async (item: ProcessingRecord) => {
    setHistory((current) => {
      const next = [item, ...current].slice(0, 30);
      void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const importApk = useCallback(async () => {
    setStatus("running");
    setProgress(0.1);
    const result = await DocumentPicker.getDocumentAsync({ type: "application/vnd.android.package-archive", copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) {
      setStatus("idle");
      return;
    }
    try {
      setProgress(0.35);
      const asset = result.assets[0];
      if (!asset.name.toLowerCase().endsWith(".apk")) throw new Error("Selecione um arquivo com extensão .apk.");
      const analyzed = await analyzeApkAsset(asset);
      const next: ImportedApk = { name: asset.name, uri: asset.uri, size: analyzed.size, sha256: analyzed.sha256, importedAt: new Date().toISOString(), analysis: analyzed.analysis };
      setImportedApk(next);
      await AsyncStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
      await appendHistory(record("analyze", analyzed.analysis.errors.length ? "error" : analyzed.analysis.warnings.length ? "warning" : "success", "Análise do APK", analyzed.analysis.errors[0] ?? (analyzed.analysis.warnings[0] ?? "Estrutura ZIP e integridade analisadas."), { sha256: analyzed.sha256 }));
      setProgress(1);
      setStatus(analyzed.analysis.errors.length ? "error" : analyzed.analysis.warnings.length ? "warning" : "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao analisar o APK.";
      await appendHistory(record("analyze", "error", "Análise do APK", message));
      setStatus("error");
      setProgress(0);
      throw error;
    }
  }, [appendHistory]);

  const runWorkerOperation = useCallback(async (operation: WorkerOperation) => {
    if (!importedApk) throw new Error("Importe e analise um APK antes de iniciar uma operação.");
    setStatus("running");
    setProgress(0.15);
    try {
      const response = await submitWorkerJob(worker, operation, importedApk.uri, importedApk.sha256);
      await appendHistory(record(operation, response.status === "success" ? "success" : "running", operation === "protect" ? "Proteção/ofuscação" : operation === "sign" ? "Assinatura" : "Recompilação", response.message ?? `Job ${response.jobId} enviado ao worker.`, { jobId: response.jobId, sha256: response.sha256 ?? importedApk.sha256, artifactUri: response.artifactUrl }));
      setProgress(response.status === "success" ? 1 : 0.45);
      setStatus(response.status === "success" ? "success" : "running");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Worker indisponível.";
      await appendHistory(record(operation, "blocked", operation === "protect" ? "Proteção/ofuscação" : operation === "sign" ? "Assinatura" : "Recompilação", message, { sha256: importedApk.sha256 }));
      setStatus("blocked");
      setProgress(0);
      throw error;
    }
  }, [appendHistory, importedApk, worker]);

  const checkForUpdates = useCallback(async () => {
    setUpdateStatus("Consultando GitHub Releases…");
    try {
      const releases = await fetchGithubReleases(github);
      const stable = releases.filter((release) => !release.draft && !release.prerelease);
      const latest = stable[0] ?? null;
      setLatestRelease(latest);
      if (!latest) setUpdateStatus("Nenhuma Release estável encontrada.");
      else if (compareVersions(releaseVersion(latest), CURRENT_VERSION) > 0) {
        setUpdateStatus(`Atualização disponível: v${releaseVersion(latest)}.`);
        try {
          if (Platform.OS !== "web") {
            await Notifications.scheduleNotificationAsync({ content: { title: "APK PROTECTOR V1", body: `Nova versão v${releaseVersion(latest)} disponível.` }, trigger: null });
          }
        } catch (notificationError) {
          console.warn("Notificação de atualização indisponível", notificationError);
        }
      }
      else setUpdateStatus("VOCÊ JÁ ESTÁ NA ÚLTIMA VERSÃO!");
    } catch (error) {
      setLatestRelease(null);
      setUpdateStatus(error instanceof Error ? error.message : "Falha ao consultar o GitHub.");
    }
  }, [github]);

  const downloadLatest = useCallback(async () => {
    if (!latestRelease) throw new Error("Verifique atualizações antes de baixar.");
    const asset = releaseApk(latestRelease);
    if (!asset) throw new Error("A Release não possui um APK anexado.");
    const expected = releaseSha256(latestRelease);
    if (!expected) throw new Error("A Release não informa SHA-256; o download não será considerado verificado.");
    if (!FileSystem.cacheDirectory) throw new Error("O diretório de cache não está disponível neste dispositivo.");
    const target = `${FileSystem.cacheDirectory}${asset.name}`;
    try {
      const download = await FileSystem.downloadAsync(asset.browser_download_url, target);
      const info = await FileSystem.getInfoAsync(download.uri);
      if (!info.exists) throw new Error("O APK baixado não foi encontrado no armazenamento local.");
      const picked = await analyzeApkAsset({ name: asset.name, uri: download.uri, size: info.size, lastModified: Date.now() });
      if (picked.sha256.toLowerCase() !== expected.toLowerCase()) throw new Error("SHA-256 do APK baixado não corresponde ao manifesto da Release.");
      await appendHistory(record("update", "success", "Download de atualização", `v${releaseVersion(latestRelease)} verificada por SHA-256.`, { sha256: picked.sha256, artifactUri: download.uri }));
      setUpdateStatus(`v${releaseVersion(latestRelease)} baixada e verificada.`);
      return download.uri;
    } catch (error) {
      setUpdateStatus(error instanceof Error ? error.message : "Falha ao baixar a atualização.");
      throw error;
    }
  }, [appendHistory, latestRelease]);

  const installArtifact = useCallback(async (uri?: string) => {
    if (Platform.OS !== "android") throw new Error("A instalação oficial está disponível somente no Android.");
    if (!uri) throw new Error("Nenhum artefato verificado está disponível para instalar.");
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, type: "application/vnd.android.package-archive", flags: 1 });
    await appendHistory(record("install", "success", "Instalação", "Instalador oficial do Android aberto após autorização.", { artifactUri: uri }));
  }, [appendHistory]);

  const saveArtifactToDownloads = useCallback(async (uri?: string, name = "apk-protector-release.apk") => {
    if (Platform.OS !== "android") throw new Error("Salvar em Downloads é suportado somente no Android.");
    if (!uri) throw new Error("Nenhum artefato disponível para exportação.");
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) throw new Error("Permissão para escolher a pasta de destino foi recusada.");
    const target = await StorageAccessFramework.createFileAsync(permission.directoryUri, name, "application/vnd.android.package-archive");
    await FileSystem.copyAsync({ from: uri, to: target });
    await appendHistory(record("download", "success", "Exportação", "APK salvo na pasta escolhida pelo usuário.", { artifactUri: target }));
    return target;
  }, [appendHistory]);

  const setGithub = useCallback(async (value: GithubConfig) => { const normalized = { owner: value.owner.trim(), repo: value.repo.trim() }; setGithubState(normalized); await AsyncStorage.setItem(GITHUB_KEY, JSON.stringify(normalized)); }, []);
  const setWorker = useCallback(async (value: WorkerConfig) => { const normalized = { endpoint: value.endpoint.trim().replace(/\/$/, ""), token: value.token?.trim() ?? "" }; setWorkerState(normalized); await AsyncStorage.setItem(WORKER_KEY, JSON.stringify({ endpoint: normalized.endpoint })); if (normalized.token) await SecureStore.setItemAsync(WORKER_TOKEN_KEY, normalized.token); else await SecureStore.deleteItemAsync(WORKER_TOKEN_KEY); }, []);
  const clearImported = useCallback(async () => { setImportedApk(null); await AsyncStorage.removeItem(IMPORTED_KEY); }, []);

  const value = useMemo<AppContextValue>(() => ({ importedApk, history, status, progress, github, worker, latestRelease, updateStatus, importApk, runWorkerOperation, downloadLatest, installArtifact, saveArtifactToDownloads, checkForUpdates, setGithub, setWorker, clearImported }), [importedApk, history, status, progress, github, worker, latestRelease, updateStatus, importApk, runWorkerOperation, downloadLatest, installArtifact, saveArtifactToDownloads, checkForUpdates, setGithub, setWorker, clearImported]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApkApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApkApp deve ser usado dentro de ApkAppProvider");
  return context;
}
