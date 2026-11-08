import { unzipSync } from "fflate";
import { sha256 } from "js-sha256";
import { File } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { ApkAnalysis } from "./types";
export { formatBytes, shortHash } from "./presentation";
import { formatBytes, shortHash } from "./presentation";

export const MAX_APK_SIZE_BYTES = 250 * 1024 * 1024;

async function readAssetBytes(asset: DocumentPickerAsset): Promise<Uint8Array> {
  if (asset.file && typeof asset.file.arrayBuffer === "function") {
    return new Uint8Array(await asset.file.arrayBuffer());
  }
  if (!asset.uri) throw new Error("O seletor não retornou uma URI de arquivo válida.");
  return new File(asset.uri).bytes();
}

function hasMagic(bytes: Uint8Array, magic: string): boolean {
  const target = new TextEncoder().encode(magic);
  outer: for (let index = 0; index <= bytes.length - target.length; index += 1) {
    for (let offset = 0; offset < target.length; offset += 1) {
      if (bytes[index + offset] !== target[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function decodeManifestPreview(bytes: Uint8Array): "binary" | "xml" | "unknown" {
  const preview = new TextDecoder().decode(bytes.slice(0, 512)).trimStart();
  if (preview.startsWith("<?xml") || preview.startsWith("<manifest")) return "xml";
  if (bytes.length > 8 && bytes[0] === 0x03 && bytes[1] === 0x00) return "binary";
  return "unknown";
}

export async function analyzeApkAsset(asset: DocumentPickerAsset): Promise<{
  size: number;
  sha256: string;
  analysis: ApkAnalysis;
}> {
  const file = new File(asset.uri);
  const size = asset.size ?? (file.exists ? file.size : 0);
  if (size > MAX_APK_SIZE_BYTES) {
    throw new Error(`O APK excede o limite seguro de ${Math.round(MAX_APK_SIZE_BYTES / 1024 / 1024)} MB.`);
  }

  const bytes = await readAssetBytes(asset);
  const digest = sha256(bytes);
  const errors: string[] = [];
  const warnings: string[] = [];
  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(bytes);
  } catch {
    return {
      size: bytes.byteLength,
      sha256: digest,
      analysis: {
        validZip: false,
        hasManifest: false,
        hasResources: false,
        dexCount: 0,
        entryCount: 0,
        signature: "unknown",
        manifestType: "unknown",
        warnings: [],
        errors: ["O arquivo não possui uma estrutura ZIP/APK válida."],
      },
    };
  }

  const names = Object.keys(entries);
  const hasManifest = names.includes("AndroidManifest.xml");
  const hasResources = names.includes("resources.arsc");
  const dexCount = names.filter((name) => /^classes(?:\d+)?\.dex$/.test(name)).length;
  const v1 = names.some((name) => name.startsWith("META-INF/") && name.endsWith(".RSA")) ||
    names.some((name) => name.startsWith("META-INF/") && name.endsWith(".DSA"));
  const v2Plus = hasMagic(bytes, "APK Sig Block 42");
  const signature = v1 && v2Plus ? "v1+v2+" : v1 ? "v1" : v2Plus ? "v2+" : "unsigned";
  const manifestType = hasManifest ? decodeManifestPreview(entries["AndroidManifest.xml"]) : "missing";

  if (!hasManifest) errors.push("AndroidManifest.xml não encontrado.");
  if (manifestType === "unknown") warnings.push("O manifesto está em formato binário não reconhecido pelo analisador JS.");
  if (!hasResources) warnings.push("resources.arsc não encontrado; pode ser um APK split ou um artefato incompleto.");
  if (dexCount === 0) warnings.push("Nenhum arquivo DEX foi encontrado.");
  if (signature === "unsigned") warnings.push("Nenhuma assinatura APK conhecida foi detectada.");
  if (signature === "v2+") warnings.push("Assinatura v2/v3/v4 detectada; a verificação criptográfica completa depende de apksigner.");
  if (bytes.byteLength !== size && size > 0) warnings.push("O tamanho informado pelo provedor diferiu do conteúdo lido; o digest usa o conteúdo efetivo.");

  return {
    size: bytes.byteLength,
    sha256: digest,
    analysis: {
      validZip: true,
      hasManifest,
      hasResources,
      dexCount,
      entryCount: names.length,
      signature,
      manifestType,
      warnings,
      errors,
    },
  };
}
