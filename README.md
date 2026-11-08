# APK PROTECTOR V1

Aplicativo Android para análise segura e distribuição controlada de APKs. A interface usa Expo/React Native e a identidade visual preta e vermelha. O aplicativo não executa APKs importados; ele calcula SHA-256, inspeciona a estrutura ZIP e registra evidências de cada operação.

## O que funciona no app

A tela Painel permite importar e analisar um APK, mostrando tamanho, hash, manifesto, entradas ZIP, DEX, assinatura detectada, avisos e erros. A tela Arquivos conserva o histórico local. A tela Atualização Online consulta GitHub Releases, compara versões, exige um SHA-256 publicado, baixa o APK e abre o instalador oficial do Android somente após ação do usuário. A tela Configurações salva o canal do GitHub e o endpoint/token do worker; o token é armazenado no SecureStore do dispositivo.

## Worker nativo

O diretório `worker/` contém um serviço HTTP autenticado e o script `worker/scripts/process-apk.sh`. O worker precisa rodar em ambiente com Java 17, Python 3, Apktool, Android SDK/Build Tools 35.0.0, `apksigner` e `zipalign`. Ele aceita jobs multipart e mantém o processamento isolado por diretório temporário.

A operação `sign` alinha, assina e valida o APK com `apksigner`. `protect` usa Apktool para decodificar os DEX em Smali, renomear classes pertencentes ao package da aplicação, recompilar, alinhar, assinar e validar. `build` recompila o artefato recebido, assina e valida. Reflexão dinâmica ou componentes que dependam de nomes de classe podem exigir regras específicas; qualquer falha do Apktool ou da assinatura retorna erro real e nunca sucesso simulado.

Para iniciar o worker:

```bash
export WORKER_TOKEN='um-token-longo-e-privado'
export ANDROID_KEYSTORE_BASE64='base64-da-keystore'
export ANDROID_KEY_ALIAS='release'
export ANDROID_KEYSTORE_PASSWORD='...'
export ANDROID_KEY_PASSWORD='...'
pnpm exec tsx worker/src/index.ts
```

O endpoint de saúde é `GET /health`. O app usa `POST /api/v1/jobs` com Bearer token e consulta `GET /api/v1/jobs/:jobId` até obter o artefato.
Defina `EXPO_PUBLIC_WORKER_URL` no ambiente do build para preencher o endpoint padrão; o `WORKER_TOKEN` deve ser informado apenas na tela Configurações do Android e fica no SecureStore.

## GitHub Actions

- `.github/workflows/release.yml` executa TypeScript, usa `EXPO_TOKEN` para o EAS, gera um APK e publica `APK-PROTECTOR-V1.apk` e seu `.sha256` em uma Release.
- `.github/workflows/apk-worker.yml` instala Android Build Tools, valida o worker e permite execução manual de `sign`, `protect` e `build`. As credenciais de assinatura devem estar em GitHub Secrets; nunca commite keystore ou senha.
- `eas.json` define um build Android do tipo APK.

### Secrets mínimos de Release

`EXPO_TOKEN` é necessário para o workflow de build do app. A conta Expo/EAS precisa ter acesso ao projeto configurado. O workflow não inventa um APK se o build remoto falhar.

### Secrets mínimos do worker/assinatura

`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD` e `ANDROID_KEY_PASSWORD` precisam existir no workflow manual. O workflow materializa a keystore em `/tmp/release.jks` durante o job e a apaga junto com o runner; a chave privada não pode ser publicada no repositório.

## Atualização pelo GitHub Releases

Cada Release estável precisa ter um APK anexado e um corpo contendo `APK_SHA256=<64 hex>`, que é gerado automaticamente pelo workflow. O app bloqueia downloads sem esse digest ou com hash divergente. A compatibilidade de certificado não é substituída pelo hash: o Android ainda valida a assinatura quando o instalador recebe o pacote.

## Verificação local

```bash
./node_modules/.bin/tsc --noEmit --pretty false
bash -n worker/scripts/process-apk.sh
```

O build nativo Android final deve ser acionado pelo EAS/Dashboard ou GitHub Actions; o Sandbox não é tratado como ambiente de release Android.
