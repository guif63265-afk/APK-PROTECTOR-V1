#!/usr/bin/env bash
set -Eeuo pipefail

operation="${1:?operation required}"
input="${2:?input apk required}"
output="${3:?output apk required}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Ferramenta obrigatória ausente: $1" >&2
    exit 20
  }
}

require_cmd apksigner
require_cmd zipalign
require_cmd sha256sum
require_cmd java
require_cmd python3

[[ -f "$input" ]] || { echo "APK de entrada não encontrado." >&2; exit 21; }
[[ "${input##*.}" == "apk" ]] || { echo "A entrada precisa ter extensão .apk." >&2; exit 22; }

: "${ANDROID_KEYSTORE_PATH:?ANDROID_KEYSTORE_PATH não configurado}"
: "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS não configurado}"
: "${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD não configurado}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD não configurado}"

mkdir -p "$(dirname "$output")"
work_dir="$(mktemp -d -t apk-protector.XXXXXX)"
trap 'rm -rf "$work_dir"' EXIT

sign_and_verify() {
  local unsigned_input="$1"
  local signed_output="$2"
  local aligned="$work_dir/aligned.apk"

  zipalign -f -p 4 "$unsigned_input" "$aligned"
  apksigner sign \
    --ks "$ANDROID_KEYSTORE_PATH" \
    --ks-key-alias "$ANDROID_KEY_ALIAS" \
    --ks-pass "pass:$ANDROID_KEYSTORE_PASSWORD" \
    --key-pass "pass:$ANDROID_KEY_PASSWORD" \
    --out "$signed_output" \
    "$aligned"
  zipalign -c -p 4 "$signed_output"
  apksigner verify --verbose --print-certs "$signed_output"
  [[ -s "$signed_output" ]] || { echo "O APK assinado não foi criado." >&2; exit 40; }
  echo "Assinatura e alinhamento verificados." >&2
}

rebuild_with_apktool() {
  local source_apk="$1"
  local decoded="$work_dir/decoded"
  local rebuilt="$work_dir/rebuilt-unsigned.apk"

  require_cmd apktool
  apktool d --force --output "$decoded" "$source_apk"
  if [[ "$operation" == "protect" ]]; then
    python3 "$script_dir/obfuscate-smali.py" "$decoded"
  fi
  apktool b "$decoded" --output "$rebuilt"
  [[ -s "$rebuilt" ]] || { echo "Apktool não produziu o APK recompilado." >&2; exit 41; }
  sign_and_verify "$rebuilt" "$output"
}

case "$operation" in
  protect)
    echo "Decodificando DEX para Smali, renomeando classes da aplicação e recompilando com Apktool." >&2
    rebuild_with_apktool "$input"
    ;;
  build)
    echo "Recompilando o APK com Apktool e validando a assinatura resultante." >&2
    rebuild_with_apktool "$input"
    ;;
  sign)
    echo "Alinhando, assinando e verificando o APK recebido." >&2
    sign_and_verify "$input" "$output"
    ;;
  *)
    echo "Operação inválida: $operation" >&2
    exit 32
    ;;
esac

sha256sum "$output"
echo "Operação $operation concluída com artefato assinado e verificado." >&2
