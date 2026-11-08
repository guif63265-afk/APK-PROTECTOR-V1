#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -n "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
  install -d -m 700 /run/secrets
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /run/secrets/apk-protector-release.jks
  chmod 600 /run/secrets/apk-protector-release.jks
  export ANDROID_KEYSTORE_PATH=/run/secrets/apk-protector-release.jks
fi

exec "$@"
