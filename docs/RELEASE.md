# Primeira Release do APK PROTECTOR V1

O repositório e o workflow estão prontos, mas o build final exige uma conta Expo/EAS e a chave de assinatura do proprietário.

## 1. Vincular o projeto EAS

No diretório do projeto, execute `npx eas-cli@latest login` e `npx eas-cli@latest project:init`, ou configure o projeto EAS equivalente no Dashboard. O `EXPO_TOKEN` usado no CI deve ter acesso a esse projeto.

## 2. Adicionar Secret do build

No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret** e adicione:

- `EXPO_TOKEN`: token de automação da conta Expo/EAS.

Não cole o token no código, em Issues ou em mensagens públicas.

## 3. Assinatura do app

A assinatura do próprio app Android deve ser mantida pela conta EAS. Para o worker de APKs, adicione somente se for usar a operação `sign` manual:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

A keystore deve ser a chave do proprietário e não pode ser gerada casualmente durante o CI. O workflow materializa o arquivo apenas durante o job.

## 4. Publicar

Depois de salvar `EXPO_TOKEN`, use **Actions → Android release → Run workflow** ou crie uma tag `v1.0.0`. O workflow deve gerar `APK-PROTECTOR-V1.apk`, calcular SHA-256, publicar a Release e incluir `APK_SHA256=<digest>` nas notas. O app consulta esse manifesto e bloqueia downloads sem digest ou com digest divergente.
