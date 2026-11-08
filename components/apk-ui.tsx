import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import type { OperationStatus } from "@/lib/apk/types";

export const COLORS = { bg: "#08090B", surface: "#111318", surface2: "#171A20", border: "#2A2E38", text: "#F4F5F7", muted: "#9298A5", red: "#E11D2E", redSoft: "#40151D", green: "#43D17A", amber: "#F5B94C", blue: "#69A7FF" };

export function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return <View style={styles.sectionTitle}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>;
}

export function StatusBadge({ status, label }: { status: OperationStatus; label?: string }) {
  const color = status === "success" ? COLORS.green : status === "warning" ? COLORS.amber : status === "error" || status === "blocked" ? COLORS.red : status === "running" ? COLORS.blue : COLORS.muted;
  return <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}18` }]}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.badgeText, { color }]}>{label ?? status.toUpperCase()}</Text></View>;
}

export function ActionButton({ label, onPress, disabled, tone = "primary", loading, icon }: { label: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "secondary" | "danger"; loading?: boolean; icon?: string }) {
  const backgroundColor = tone === "primary" ? COLORS.red : tone === "danger" ? COLORS.redSoft : COLORS.surface2;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.action, { backgroundColor, borderColor: tone === "secondary" ? COLORS.border : backgroundColor }, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={COLORS.text} size="small" /> : icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}<Text style={styles.actionText}>{label}</Text></Pressable>;
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.panel, style]}>{children}</View>; }
export function KeyValue({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <View style={styles.keyValue}><Text style={styles.key}>{label}</Text><Text style={[styles.value, mono && styles.mono]} numberOfLines={2}>{value}</Text></View>; }
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <View style={styles.empty}><Text style={styles.emptyMark}>//</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>; }

export const styles = StyleSheet.create({
  sectionTitle: { gap: 5, marginBottom: 16 }, eyebrow: { color: COLORS.red, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 }, title: { color: COLORS.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }, detail: { color: COLORS.muted, fontSize: 13, lineHeight: 19 }, panel: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }, badge: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3 }, badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }, action: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, actionText: { color: COLORS.text, fontWeight: "800", fontSize: 13, letterSpacing: 0.2 }, buttonIcon: { color: COLORS.text, fontSize: 18, fontWeight: "800" }, disabled: { opacity: 0.45 }, pressed: { transform: [{ scale: 0.985 }], opacity: 0.88 }, keyValue: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingVertical: 4 }, key: { color: COLORS.muted, fontSize: 12 }, value: { color: COLORS.text, fontSize: 12, fontWeight: "700", flex: 1, textAlign: "right" }, mono: { fontFamily: "monospace", fontWeight: "500" }, empty: { alignItems: "center", justifyContent: "center", padding: 28, gap: 8 }, emptyMark: { color: COLORS.red, fontFamily: "monospace", fontSize: 20 }, emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" }, emptyDetail: { color: COLORS.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
