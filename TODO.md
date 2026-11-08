# APK PROTECTOR V1 — Resultados

## 1. Painel operacional preto e vermelho

- [ ] O aplicativo Android usa identidade visual preta e vermelha em todas as telas, com nome APK PROTECTOR V1, navegação por abas, ações primárias claras e estados de sucesso, aviso, erro e indisponibilidade.
- [ ] O painel mostra nome do APK importado, tamanho, SHA-256 quando calculado, status da proteção, status da assinatura, progresso da operação, histórico recente e mensagens reais.

## 2. Importação e análise segura

- [ ] O usuário consegue selecionar um APK pelo armazenamento Android.
- [ ] O aplicativo mostra nome e tamanho, valida extensão/tamanho e não executa o arquivo importado.
- [ ] O aplicativo calcula SHA-256 e analisa a estrutura ZIP/manifesto quando possível, apresentando problemas encontrados antes de qualquer processamento.

## 3. Worker de proteção e recompilação

- [ ] O worker/CI recebe somente jobs autorizados, valida o arquivo, executa ferramentas Android isoladas e registra versão das ferramentas, logs, digest e artefato.
- [ ] A proteção/ofuscação somente é aplicada quando o pipeline possui projeto/artefato compatível; APK arbitrário não é falsamente declarado como protegido.
- [ ] Falhas de Android SDK, apktool, Gradle, R8/ProGuard, recursos ou manifesto aparecem como erros reais e o artefato inválido não é publicado.

## 4. Assinatura e validação

- [ ] O pipeline permite keystore configurada por Secrets, nunca publica a chave privada e recusa assinatura sem credenciais válidas.
- [ ] O pipeline usa apksigner/zipalign e valida a assinatura resultante; os esquemas suportados dependem da versão real das Build Tools.
- [ ] O app mostra o status da assinatura e verifica SHA-256 antes do download/instalação.

## 5. Exportação e instalação

- [ ] O artefato final pode ser baixado e salvo em Downloads quando a plataforma Android e as permissões permitirem.
- [ ] A instalação só inicia após ação explícita do usuário e usa o instalador oficial do Android.
- [ ] Se o ambiente não expuser uma URI instalável ou permissão compatível, o app informa o bloqueio e não simula instalação.

## 6. Histórico e atualização online

- [ ] O histórico registra nome, data, status, digest, versão e mensagem de cada processamento local ou remoto.
- [ ] A tela ATUALIZAÇÃO ONLINE consulta GitHub Releases, compara versões, mostra data/notas, histórico e os botões VERIFICAR ATUALIZAÇÕES e ATUALIZAR AGORA.
- [ ] Sem atualização, a mensagem exibida é VOCÊ JÁ ESTÁ NA ÚLTIMA VERSÃO!
- [ ] O APK baixado é verificado por SHA-256 e assinatura quando o manifesto fornecer essa evidência; a instalação nunca é silenciosa.

## 7. GitHub Actions e entrega

- [ ] O repositório contém workflow de checagem TypeScript/testes, build Android e publicação em Release usando Secrets.
- [ ] O workflow do worker executa somente em ambiente com Android SDK/Build Tools e falha explicitamente quando as ferramentas não estiverem configuradas.
- [ ] O APK de release, o repositório e o link direto só são marcados como entregues depois de confirmação real do build/publicação.
