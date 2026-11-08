# APK Protector Worker

Serviço separado para operações que exigem Android SDK/Build Tools. Use HTTPS e um `WORKER_TOKEN` longo; não exponha o serviço sem autenticação.

O endpoint aceita `multipart/form-data` em `POST /api/v1/jobs` com:

- `apk`: arquivo APK;
- `operation`: `sign`, `protect` ou `build`;
- `sha256`: digest calculado pelo app.

O worker processa `sign` com `zipalign` e `apksigner`. `protect` e `build` retornam erro para APK pronto porque R8/recompilação devem operar em projeto fonte Gradle compatível. Essa recusa é intencional para evitar artefatos corrompidos.

Para Docker:

```bash
docker build -f worker/Dockerfile -t apk-protector-worker .
docker run --rm -p 8787:8787 \
  -e WORKER_TOKEN='troque-este-token' \
  -e ANDROID_KEYSTORE_PATH='/run/secrets/release.jks' \
  -e ANDROID_KEY_ALIAS='release' \
  -e ANDROID_KEYSTORE_PASSWORD='...' \
  -e ANDROID_KEY_PASSWORD='...' \
  apk-protector-worker
```

Nunca coloque a keystore no Git. Monte-a como Secret de runtime.
