# APK Protector Worker

Serviço separado para operações que exigem Android SDK/Build Tools. Use HTTPS e um `WORKER_TOKEN` longo; não exponha o serviço sem autenticação.

O endpoint de saúde é `GET /health`. Jobs usam `multipart/form-data` em `POST /api/v1/jobs` com:

- `apk`: arquivo APK;
- `operation`: `sign`, `protect` ou `build`;
- `sha256`: digest calculado pelo app.

Todos os jobs exigem `Authorization: Bearer <WORKER_TOKEN>`. `sign` usa `zipalign` e `apksigner`. `protect` decodifica o APK com Apktool, renomeia deterministicamente as classes Smali pertencentes ao package da aplicação (preservando `R` e `BuildConfig`), recompila os DEX, alinha, assina e valida. `build` recompila o APK recebido com Apktool, assina e valida. Se Apktool, Build Tools, keystore ou o rebuild falharem, o job retorna `error` com o log real; nunca retorna sucesso simulado.

O app deve receber `EXPO_PUBLIC_WORKER_URL` no ambiente de build para preencher o endpoint padrão. O token nunca é embutido no bundle: informe-o apenas na tela Configurações do Android, onde é salvo no SecureStore.

Para Docker:

```bash
docker build -f worker/Dockerfile -t apk-protector-worker .
docker run --rm -p 8787:8787 \
  -e WORKER_TOKEN='troque-este-token' \
  -e ANDROID_KEYSTORE_BASE64='base64-da-keystore' \
  -e ANDROID_KEY_ALIAS='release' \
  -e ANDROID_KEYSTORE_PASSWORD='...' \
  -e ANDROID_KEY_PASSWORD='...' \
apk-protector-worker
```

Teste a disponibilidade sem expor o token:

```bash
curl -fsS https://worker.exemplo.com/health
```

O entrypoint decodifica `ANDROID_KEYSTORE_BASE64` somente em `/run/secrets` e define `ANDROID_KEYSTORE_PATH` internamente. Nunca coloque a keystore no Git, em imagem ou em mensagem.
