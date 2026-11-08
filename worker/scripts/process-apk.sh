#!/usr/bin/env bash
set -Eeuo pipefail

operation="${1:?operation required}"
input="${2:?input apk required}"
output="${3:?output apk required}"

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Ferramenta obrigatória ausente: $1" >&2; exit 20; }; }
require_cmd apksigner
require_cmd zipalign
require_cmd sha256sum

[[ -f "$input" ]] || { echo "APK de entrada não encontrado." >&2; exit 21; }
[[ "${input##*.}" == "apk" ]] || { echo "A entrada precisa ter extensão .apk." >&2; exit 22; }

if [[ "$operation" == "protect" ]]; then
  echo "Proteção/ofuscação real de um APK já compilado não é segura sem projeto fonte e pipeline Gradle/R8." >&2
  echo "Use o workflow de projeto fonte com minifyEnabled e uma keystore configurada." >&2
  exit 30
fi

if [[ "$operation" == "build" ]]; then
  echo "Recompilação exige um projeto fonte Gradle; um APK pronto não pode ser recompilado de forma confiável neste job." >&2
  exit 31
fi

if [[ "$operation" != "sign" ]]; then echo "Operação inválida: $operation" >&2; exit 32; fi

: "${ANDROID_KEYSTORE_PATH:?ANDROID_KEYSTORE_PATH não configurado}"
: "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS não configurado}"
: "${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD não configurado}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD não configurado}"

mkdir -p "$(dirname "$output")"
unsigned="${output%.apk}-unsigned.apk"
zipalign -f -p 4 "$input" "$unsigned"
apksigner sign --ks "$ANDROID_KEYSTORE_PATH" --ks-key-alias "$ANDROID_KEY_ALIAS" --ks-pass "pass:$ANDROID_KEYSTORE_PASSWORD" --key-pass "pass:$ANDROID_KEY_PASSWORD" --out "$output" "$unsigned"
apksigner verify --verbose --print-certs "$output"
sha256sum "$output"
rm -f "$unsigned"
echo "Assinatura concluída; proteção/ofuscação não foi declarada para APK arbitrário."
