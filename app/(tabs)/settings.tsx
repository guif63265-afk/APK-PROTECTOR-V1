import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ActionButton, COLORS, Panel, SectionTitle, StatusBadge } from "@/components/apk-ui";
import { useApkApp } from "@/lib/apk/app-context";

export default function SettingsScreen() {
  const { github, worker, setGithub, setWorker } = useApkApp();
  const [owner, setOwner] = useState(github.owner);
  const [repo, setRepo] = useState(github.repo);
  const [endpoint, setEndpoint] = useState(worker.endpoint);
  const [token, setToken] = useState(worker.token ?? "");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setOwner(github.owner); setRepo(github.repo); }, [github.owner, github.repo]);
  useEffect(() => { setEndpoint(worker.endpoint); setToken(worker.token ?? ""); }, [worker.endpoint, worker.token]);
  const save = async () => { await setGithub({ owner, repo }); await setWorker({ endpoint, token }); setSaved(true); Alert.alert("Configurações salvas", "O token do worker foi armazenado no SecureStore do dispositivo."); };
  return <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background"><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><SectionTitle eyebrow="CONFIGURAÇÕES" title="Canais e segurança" detail="O GitHub é usado somente para Releases. O worker é o único caminho para processamento nativo." />
    <Panel><View style={styles.panelHeader}><Text style={styles.title}>GITHUB RELEASES</Text><StatusBadge status={owner && repo ? "success" : "warning"} label={owner && repo ? "PRONTO" : "PENDENTE"} /></View><Text style={styles.detail}>Use um repositório público ou configure autenticação no worker. O app não grava tokens do GitHub.</Text><Field label="PROPRIETÁRIO / ORGANIZAÇÃO" value={owner} onChangeText={setOwner} placeholder="ex.: minha-conta" autoCapitalize="none" /><Field label="REPOSITÓRIO" value={repo} onChangeText={setRepo} placeholder="APK-PROTECTOR-V1" autoCapitalize="none" /></Panel>
    <Panel><View style={styles.panelHeader}><Text style={styles.title}>WORKER NATIVO</Text><StatusBadge status={endpoint ? "success" : "blocked"} label={endpoint ? "CONFIGURADO" : "NÃO CONFIGURADO"} /></View><Text style={styles.detail}>Endpoint HTTPS de um serviço com Android SDK/Build Tools. Sem ele, proteção, assinatura e recompilação ficam bloqueadas — nunca simuladas.</Text><Field label="ENDPOINT HTTPS" value={endpoint} onChangeText={setEndpoint} placeholder="https://worker.exemplo.com" autoCapitalize="none" keyboardType="url" /><Field label="TOKEN DO WORKER" value={token} onChangeText={setToken} placeholder="Opcional — armazenado com segurança" secureTextEntry autoCapitalize="none" /></Panel>
    <Panel><Text style={styles.title}>POLÍTICA DE SEGURANÇA</Text><Text style={styles.bullet}>• APK importado nunca é executado automaticamente.</Text><Text style={styles.bullet}>• Keystore privada não entra no app, GitHub ou Release.</Text><Text style={styles.bullet}>• Atualização exige SHA-256 e ação explícita.</Text><Text style={styles.bullet}>• O worker deve isolar jobs e limpar temporários.</Text></Panel>
    <ActionButton label={saved ? "CONFIGURAÇÕES SALVAS" : "SALVAR CONFIGURAÇÕES"} onPress={() => void save()} />
  </ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; autoCapitalize?: "none" | "sentences" | "words" | "characters"; keyboardType?: "default" | "url" }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.muted} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize} keyboardType={keyboardType} style={styles.input} /></View>; }
const styles = StyleSheet.create({ content: { padding: 20, gap: 16, paddingBottom: 32 }, panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, title: { color: COLORS.text, fontSize: 13, fontWeight: "800", letterSpacing: 0.2 }, detail: { color: COLORS.muted, fontSize: 12, lineHeight: 18 }, field: { gap: 6 }, fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, input: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, color: COLORS.text, backgroundColor: COLORS.surface2, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 }, bullet: { color: COLORS.muted, fontSize: 12, lineHeight: 19 },
});
