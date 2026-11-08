# APK PROTECTOR V1 — Plano de implementação

## Escopo confirmado

O produto é um aplicativo Android chamado **APK PROTECTOR V1**, com identidade visual preta e vermelha, para importar APKs, analisar estrutura e integridade, proteger quando a operação for compatível, assinar, compilar/validar, exportar/instalar e acompanhar atualizações publicadas no GitHub Releases. A entrega desejada inclui código-fonte, projeto Android, GitHub Actions, APK assinado, link de download, atualização online e instruções.

## Decisão arquitetural necessária

O starter deste projeto é Expo/React Native. Ele é adequado para telas, navegação, seleção de arquivos, armazenamento seguro de preferências, hashing, leitura de metadados acessíveis e atualização via GitHub Releases. Ele não fornece sozinho as ferramentas Android necessárias para reempacotar e assinar arbitrariamente um APK: `aapt2`, `zipalign`, `apksigner`, Gradle/Android SDK, R8/ProGuard e implementação dos esquemas de assinatura v1/v2/v3/v4.

Por isso, a implementação deve separar:

1. **Aplicativo Android**: interface, seleção do APK, fluxo de análise, validações locais seguras, histórico, atualização online, download, consentimento explícito para instalação e mensagens de erro reais.
2. **Pipeline nativo de processamento**: worker executado em ambiente com Android SDK/Build Tools e ferramentas de assinatura. Esse worker recebe jobs autenticados, processa somente arquivos enviados explicitamente, gera artefatos e devolve logs/manifestos/digests. GitHub Actions será a opção de CI para compilar o próprio app e, se o usuário configurar o worker, também para executar operações de APK.
3. **Distribuição e atualização**: Releases do GitHub com arquivo APK e manifesto de versão contendo versão, notas, SHA-256 e, quando disponível, certificado de assinatura. A atualização nunca instala silenciosamente; abre o instalador oficial do Android e rejeita artefatos incompatíveis quando a verificação nativa estiver disponível.

Sem um worker nativo ou build de CI configurado, o aplicativo não deve afirmar que ofuscou, protegeu, assinou ou recompilou um APK. Nessa situação, o estado será explicitamente `não disponível neste ambiente`, com instrução do que falta.

## Plano de telas e fluxos

- **Painel**: identidade APK PROTECTOR V1, APK atual, tamanho, SHA-256, estado da análise/proteção/assinatura, progresso, histórico recente, mensagens de sucesso e erro.
- **Importar e analisar**: seletor de APK; leitura de nome/tamanho; validação de extensão e tamanho; hash SHA-256; inspeção segura de ZIP/manifesto quando as bibliotecas disponíveis permitirem; relatório de problemas sem executar o arquivo.
- **Proteção**: pré-validação, escolha de operação compatível, envio opcional ao worker, acompanhamento de job, logs, artefato e evidências. Nenhuma promessa de proteção quando o worker não estiver configurado.
- **Assinatura**: criação/importação de keystore apenas por fluxo seguro; nunca persistir a chave privada em GitHub; status de assinatura e compatibilidade; credenciais protegidas por armazenamento seguro/Secrets.
- **Compilação e exportação**: validar manifesto, recursos, bibliotecas e digest; mostrar falhas; salvar/baixar o artefato final em Downloads quando o sistema Android permitir; abrir o instalador oficial somente após autorização.
- **Atualização online**: consultar a API de Releases configurada, comparar versão, mostrar data/notas/histórico, baixar o APK, verificar SHA-256 e assinatura quando possível, e abrir o instalador oficial. Quando não houver atualização, mostrar exatamente `VOCÊ JÁ ESTÁ NA ÚLTIMA VERSÃO!`.
- **Configurações/segurança**: proprietário/repositório GitHub, canal de Releases, endpoint opcional do worker, política de retenção, instruções para Secrets e estado de diagnóstico.

## Design

### Alternativas consideradas

- **Terminal vermelho sobre preto** — probabilidade 0,07; linguagem de ferramenta de engenharia, alto contraste e foco em evidência.
- **Painel industrial minimalista** — probabilidade 0,06; cartões densos, separadores técnicos e hierarquia operacional.
- **Cyber premium** — probabilidade 0,05; brilho sutil, superfícies profundas e acentos vermelhos controlados.

### Direção escolhida: Terminal vermelho sobre preto

- **Movimento de design**: utilitário de engenharia inspirado em consoles de diagnóstico e ferramentas de release, sem estética hacker ornamental.
- **Princípios**: evidência antes de ação; contraste alto; estados sempre explícitos; uma ação primária por etapa.
- **Filosofia de cor**: preto profundo reduz ruído visual e faz o vermelho funcionar como sinal operacional — ação, alerta e integridade — não como decoração. Verde e âmbar aparecem apenas para estados semânticos.
- **Paradigma de layout**: cabeçalho compacto com identidade e estado; coluna de ação vertical; cartões de evidência empilhados; navegação inferior para Painel, Arquivos, Atualização e Configurações.
- **Elementos de assinatura**: barra lateral vermelha para o estado do pipeline; chips monoespaçados para hashes/versões; linhas de progresso com brilho discreto somente durante uma operação real.
- **Interação**: ações destrutivas ou irreversíveis pedem confirmação; operações longas exibem etapa, tempo e log; erros são acionáveis e não desaparecem sozinhos.
- **Animação**: transições de 180–240 ms; progresso indeterminado somente enquanto há job ativo; entrada suave de cartões; sem animações que escondam mudança de estado.
- **Tipografia**: Inter/Roboto para leitura e hierarquia; família monoespaçada do sistema para hashes, versões, caminhos e logs.
- **Essência da marca**: uma bancada móvel para validar e distribuir APKs com rastreabilidade. Personalidade: precisa, direta, confiável.
- **Voz**: títulos curtos e operacionais. Exemplos: `Verificação concluída` e `Assinatura ausente: configure uma keystore para continuar.`
- **Wordmark/ícone**: monograma `AP` em caixa técnica, com uma linha de checksum atravessando o bloco e uma pequena marca de escudo; o ícone deve ter fundo preto, vermelho como único acento e não deve conter cantos arredondados embutidos.
- **Cor proprietária**: vermelho `#E11D2E`, usado em CTAs, estados ativos e linha de integridade.

## Estrutura de projeto

- `app/`: rotas Expo Router para painel, arquivos, atualização e configurações.
- `components/`: cartões de status, botões de ação, log de operação, chips de hash e modais de confirmação.
- `lib/apk/`: tipos de domínio, validação de arquivo, hashing, leitura segura de metadados e cliente do worker.
- `lib/github/`: cliente da API de Releases, comparação de versões, manifesto e verificação de digest.
- `lib/storage/`: preferências, histórico e referências de artefatos; segredos somente no SecureStore/Secrets, nunca em texto simples.
- `server/`: endpoints mínimos para jobs/status quando o worker for configurado; não executar arquivos enviados no processo web.
- `.github/workflows/`: checagem TypeScript, build do app, geração de artefato e publicação em Release somente com Secrets configurados.
- `assets/images/`: ícones e splash com a identidade preta/vermelha.

## Dependências e segurança

- Usar apenas APIs React Native/Expo e bibliotecas de projeto para o fluxo mobile.
- Validar extensão, tamanho, MIME quando disponível, hash e estrutura antes de qualquer envio.
- Nunca executar um APK importado no dispositivo ou no servidor web.
- Nunca incluir keystore, senha, token GitHub ou token do worker no bundle do app ou no repositório.
- O app não instala nada sem ação explícita do usuário.
- O worker deve isolar cada job, limitar tamanho/tempo, limpar arquivos temporários e registrar digest/versão das ferramentas.

## Build e entrega

1. Implementar e verificar o app no Web Preview e com checagem TypeScript/testes determinísticos.
2. Adicionar workflow de CI que rode checagem, build do projeto e prepare o artefato Android conforme as credenciais configuradas.
3. Manter o repositório canônico do Mobile gerenciado pela Manus; conexão externa ao GitHub será feita somente pela integração autorizada e sem colocar Secrets no código.
4. O APK de release e o link de GitHub Releases só serão declarados como entregues após um build real e uma Release real confirmados.
5. Se o worker/Android SDK/credenciais não estiverem disponíveis, entregar o app com o bloqueio explicitamente reportado, sem marcar proteção, assinatura, compilação arbitrária ou instalação como concluídas.

## Critério de honestidade da entrega

Nenhuma função será marcada como pronta apenas porque a tela ou o botão existe. Cada estado de sucesso precisa de evidência: digest, log, artefato, resposta da API ou resultado do build. A proteção/assinatura/recompilação de APK continuará pendente até que o pipeline nativo seja configurado e testado em um ambiente compatível.
