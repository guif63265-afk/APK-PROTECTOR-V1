import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { ThemeProvider } from "@/lib/theme-provider";
import { ApkAppProvider } from "@/lib/apk/app-context";
import { COLORS } from "@/components/apk-ui";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };
export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  useEffect(() => { initManusRuntime(); }, []);
  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => { setInsets(metrics.insets); setFrame(metrics.frame); }, []);
  useEffect(() => { if (Platform.OS !== "web") return; return subscribeSafeAreaInsets(handleSafeAreaUpdate); }, [handleSafeAreaUpdate]);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());
  const providerInitialMetrics = useMemo(() => ({ ...(initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame }), insets: { ...initialInsets, top: Math.max(initialInsets.top, 16), bottom: Math.max(initialInsets.bottom, 12) } }), [initialInsets, initialFrame]);
  const content = <GestureHandlerRootView style={{ flex: 1 }}><trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}><ApkAppProvider><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="oauth/callback" /></Stack></ApkAppProvider><StatusBar style="light" /></QueryClientProvider></trpc.Provider></GestureHandlerRootView>;
  return <ThemeProvider><SafeAreaProvider initialMetrics={providerInitialMetrics}>{Platform.OS === "web" ? <SafeAreaFrameContext.Provider value={frame}><SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider></SafeAreaFrameContext.Provider> : content}</SafeAreaProvider></ThemeProvider>;
}
