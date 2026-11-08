import { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { ScreenContainer } from "@/components/screen-container";
import { ActionButton, COLORS, EmptyState, KeyValue, Panel, SectionTitle, StatusBadge } from "@/components/apk-ui";
import { releaseApk, releaseSha256, releaseVersion, compareVersions } from "@/lib/apk/github";
import { useApkApp } from "@/lib/apk/app-context";

export default function UpdatesScreen() {
  const { github, latestRelease, updateStatus, checkForUpdates, downloadLatest, installArtifact, history } = useApkApp();
  const [busy, setBusy] = useState(false);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
  const latestVersion = latestRelease ? releaseVersion(latestRelease) : null;
  const isUpdate = latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false;
  const apkAsset = latestRelease ? releaseApk(latestRelease) : null;
  const expectedHash = latestRelease ? releaseSha256(latestRelease) : null;
  const previousDownload = useMemo(() => history.find((item) => item.operation === "update" && item.artifactUri)?.artifactUri ?? null, [history]);
  const runCheck = async () => { setBusy(true); await checkForUpdates(); setBusy(false); };
  const runDownload = async () => { setBusy(true); try { setDownloadedUri(await downloadLatest()); } catch { /* status is surfaced by the context on next check */ } finally { setBusy(false); } };
  return <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <SectionTitle eyebrow="ATUALIZAÇÃO ONLINE" title="Distribuição controlada" detail="A origem é uma Release do GitHub. O APK só é instalado após verificação e autorização." />
    <Panel><View style={styles.panelHeader}><Text style={styles.panelTitle}>CANAL CONFIGURADO</Text><StatusBadge status={github.owner && github.repo ? "success" : "warning"} label={github.owner && github.repo ? "CONFIGURADO" : "PENDENTE"} /></View><KeyValue label="Repositório" value={github.owner ? `${github.owner}/${github.repo}` : "Configure em Configurações"} mono /><KeyValue label="Versão instalada" value={`v${currentVersion}`} /><ActionButton label="VERIFICAR ATUALIZAÇÕES" loading={busy} onPress={() => void runCheck()} /></Panel>
    <Panel><Text style={styles.panelTitle}>STATUS</Text><Text style={[styles.status, updateStatus.includes("VOCÊ JÁ") ? styles.success : styles.status]}>{updateStatus}</Text>{latestRelease ? <><KeyValue label="Última versão" value={`v${latestVersion}`} /><KeyValue label="Publicada em" value={latestRelease.published_at ? new Date(latestRelease.published_at).toLocaleString() : "—"} /><KeyValue label="APK anexado" value={apkAsset ? apkAsset.name : "ausente"} /><KeyValue label="SHA-256" value={expectedHash ? `${expectedHash.slice(0, 12)}…` : "ausente — download bloqueado"} mono />{latestRelease.body ? <View style={styles.notes}><Text style={styles.notesTitle}>NOVIDADES</Text><Text style={styles.notesText}>{latestRelease.body}</Text></View> : null}{isUpdate && apkAsset && expectedHash ? <><ActionButton label="ATUALIZAR AGORA" loading={busy} onPress={() => void runDownload()} />{downloadedUri || previousDownload ? <ActionButton label="ABRIR INSTALADOR OFICIAL" tone="danger" disabled={busy} onPress={() => void installArtifact(downloadedUri ?? previousDownload ?? undefined)} /> : null}</> : null}</> : <EmptyState title="Nenhuma Release carregada" detail="Toque em verificar para consultar o GitHub." />}</Panel>
    {latestRelease ? <Panel><Text style={styles.panelTitle}>ORIGEM</Text><Text style={styles.link} onPress={() => void Linking.openURL(latestRelease.html_url)}>{latestRelease.html_url}</Text><Text style={styles.disclaimer}>O app não aceita atualização sem SHA-256 publicado no manifesto da Release.</Text></Panel> : null}
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 16, paddingBottom: 32 }, panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, panelTitle: { color: COLORS.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" }, status: { color: COLORS.text, fontSize: 14, lineHeight: 21, fontWeight: "700" }, success: { color: COLORS.green }, notes: { borderLeftColor: COLORS.red, borderLeftWidth: 2, paddingLeft: 10, gap: 5 }, notesTitle: { color: COLORS.red, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, notesText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 }, link: { color: COLORS.blue, fontSize: 12 }, disclaimer: { color: COLORS.muted, fontSize: 11, lineHeight: 16 },
});
