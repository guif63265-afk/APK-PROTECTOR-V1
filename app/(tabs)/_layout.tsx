import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Text, type ColorValue } from "react-native";
import { COLORS } from "@/components/apk-ui";
import { HapticTab } from "@/components/haptic-tab";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.red, tabBarInactiveTintColor: COLORS.muted, tabBarButton: HapticTab, tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, height: 58 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}>
    <Tabs.Screen name="index" options={{ title: "Painel", tabBarIcon: ({ color }) => <TabIcon glyph="⌂" color={color} /> }} />
    <Tabs.Screen name="files" options={{ title: "Arquivos", tabBarIcon: ({ color }) => <TabIcon glyph="▣" color={color} /> }} />
    <Tabs.Screen name="updates" options={{ title: "Atualização", tabBarIcon: ({ color }) => <TabIcon glyph="↻" color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "Configurações", tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} /> }} />
  </Tabs>;
}

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) { return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>; }
