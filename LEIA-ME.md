# Custódia Digital — App (PWA)

## O que é isto, exatamente

Este é um aplicativo web (PWA — Progressive Web App). Não é um `.apk` nativo.
Ele roda dentro do navegador (Chrome no Android), mas pode ser "instalado"
como um app: ganha ícone na tela inicial, abre em tela cheia (sem barra do
navegador) e funciona offline depois do primeiro carregamento.

**Por que não um `.apk` nativo:** compilar um aplicativo Android de verdade
exige o Android SDK, Gradle e assinatura digital do pacote — ferramentas que
não existem no ambiente usado para gerar este projeto. O caminho realista,
sem precisar de um computador com Android Studio instalado, é o PWA descrito
abaixo. Se no futuro for necessário publicar na Play Store como app nativo,
esse HTML pode ser reaproveitado com uma ferramenta como o **PWABuilder**
(pwabuilder.com) ou o **Capacitor**, que empacotam um PWA existente em um
`.apk`/`.aab` — mas isso é uma etapa adicional, feita depois, e normalmente
por alguém da área de TI.

## Sobre a "tela de login"

A identificação de servidor (nome + matrícula + PIN de 4 dígitos) **não é
um mecanismo de segurança real**. Os dados ficam salvos apenas no
armazenamento local do navegador do próprio aparelho (`localStorage`), sem
criptografia forte e sem qualquer verificação em servidor. Ela serve para:
- Evitar erro de digitação, preenchendo automaticamente o responsável e a
  assinatura do relatório;
- Separar rapidamente o uso entre servidores diferentes que usem o mesmo
  aparelho.

Não deve ser tratada como controle de acesso oficial. Se o objetivo for
autenticação real (ex.: exigir login institucional, evitar acesso por
terceiros), isso exigiria um backend/servidor com autenticação de verdade —
o que está fora do escopo de um app que roda 100% no navegador.

## Arquivos deste pacote

- `index.html` — o aplicativo (login + formulário + geração do relatório)
- `manifest.json` — metadados do PWA (nome, ícone, cor)
- `service-worker.js` — permite funcionar offline após o primeiro acesso
- `icon-192.png`, `icon-512.png` — ícone do app

## Já instalou uma versão anterior?

Se algum celular já tinha o app instalado (ícone na tela inicial) antes desta
atualização, o app pode continuar mostrando a versão antiga por um tempo,
porque ele funciona offline com uma cópia salva localmente. Para forçar a
atualização: feche o app, abra de novo com internet ligada (o Chrome verifica
por uma versão nova em segundo plano) ou, se não atualizar sozinho, desinstale
o ícone e instale novamente pelo link.

## Recursos que dependem de internet no aparelho

- **Seletor de data e hora (quadro flutuante em rodas)**: é todo feito com
  código próprio, sem depender de nenhuma biblioteca externa — funciona
  normalmente mesmo sem internet.
- **Botão "Usar localização atual"**: usa o GPS do aparelho (não depende de
  internet) e depois tenta converter as coordenadas em um endereço legível
  (isso sim depende de internet). Sem internet, ou se o serviço de endereço
  falhar, o campo é preenchido só com as coordenadas — sempre revise o
  resultado antes de gerar o relatório.
- Assim como a instalação do PWA, a geolocalização só funciona com o app
  aberto em endereço `https://` (não funciona abrindo o arquivo local direto
  do armazenamento do celular).

## Histórico de relatórios

Toda vez que você toca em "Gerar relatório (PDF)", uma cópia desse
relatório fica salva automaticamente num histórico local, acessível pelo
menu ☰ → **"🕘 Histórico de relatórios"**.

- O histórico é filtrado por servidor: cada pessoa só vê os relatórios
  que ela mesma gerou, mesmo que o aparelho seja compartilhado entre
  vários servidores.
- Cada item mostra o número do relatório, data/hora de emissão,
  responsável e se os hashes bateram ou não.
- **"Abrir"** reexibe o relatório salvo (com o botão de imprimir/salvar
  PDF funcionando normalmente).
- **"Excluir"** remove o relatório do histórico — não pode ser desfeito.
- Fica salvo apenas no armazenamento local do navegador deste aparelho
  (mesmo mecanismo usado para os cadastros de servidor). Limpar os
  dados do navegador, trocar de aparelho, ou desinstalar o app apaga o
  histórico. Não é enviado a nenhum servidor.
- Por segurança de espaço, o app guarda no máximo os 200 relatórios mais
  recentes gerados no aparelho (contando todos os servidores juntos);
  relatórios mais antigos que esse limite são descartados automaticamente.

## Leitura automática de IMEI por foto (OCR)

Ao lado do campo IMEI, o botão **"📷 Ler IMEI de uma foto"** permite anexar
um print de tela (ex.: a tela "Sobre o telefone" ou a tela de IMEI/EID de
alguns Samsung) e o app tenta reconhecer o número automaticamente, usando
OCR (leitura de texto em imagem) que roda no navegador.

- **Precisa de internet** só nesse momento — a biblioteca de OCR é
  carregada de um CDN. Sem internet, aparece uma mensagem explicando isso
  e você preenche manualmente.
- O app nunca preenche o campo sozinho sem mostrar o valor primeiro: ele
  lista os números encontrados como botões, e você escolhe/confirma qual
  usar. Isso existe porque OCR pode errar dígitos — sempre confira o
  valor contra a tela original antes de gerar o relatório.
- Funciona melhor com prints nítidos, sem zoom exagerado nem baixa
  resolução. Se não encontrar nada, tente um print mais legível ou
  preencha manualmente.

## Verificação de e-mail no cadastro de novo servidor

Ao cadastrar um novo servidor, o app agora exige e-mail e telefone
(WhatsApp), e **só libera a criação do PIN depois de confirmar um
código enviado por e-mail** — assim, ninguém consegue criar um perfil
usando um e-mail que não é seu.

### Por que isso precisa de uma peça extra (Google Apps Script)

O app roda inteiramente no navegador, sem servidor próprio — e enviar
e-mails de verdade exige, obrigatoriamente, algum tipo de servidor (por
segurança da própria internet, nenhum site consegue disparar e-mails
sozinho a partir do navegador de quem o visita). A solução mais simples
e gratuita é usar o **Google Apps Script**: um pequeno programa que
roda nos servidores do Google, vinculado a uma conta Google
institucional, capaz de enviar e-mails de verdade em nome dessa conta.

### Passo a passo para publicar (feito uma vez, pelo TI)

1. Acesse [script.google.com](https://script.google.com) com a conta
   Google institucional (a mesma que deve aparecer como remetente dos
   e-mails de verificação).
2. **Novo projeto** → apague o conteúdo padrão → cole todo o conteúdo
   do arquivo `Codigo_Apps_Script_Verificacao_Email.gs` (incluído neste
   pacote).
3. Salve o projeto (ex.: nome "Verificação Custódia Digital").
4. **Implantar** → **Nova implantação** → ícone de engrenagem → tipo
   **"App da Web"**.
   - **Executar como:** Eu (sua conta)
   - **Quem pode acessar:** Qualquer pessoa
5. Clique em **Implantar**. O Google vai pedir para autorizar
   permissões (enviar e-mail em seu nome) — aceite.
6. Copie a URL gerada (termina em `/exec`).
7. No app, entre com um cadastro existente → menu ☰ → **"🔗 Gerenciar
   Repartições"** → toque em **"⚙️ Configurar verificação de e-mail"**
   (fica no topo dessa tela), cole essa URL e toque em **Salvar**.

### Como funciona, depois de configurado

1. Ao cadastrar um novo servidor, depois de preencher nome, cargo,
   matrícula, e-mail e telefone, o botão vira **"Enviar código de
   verificação"**.
2. Um código de 6 dígitos chega no e-mail informado (confira também a
   pasta de spam).
3. Digite o código → **"Verificar código"**.
4. Só depois disso aparece o campo para criar o PIN e concluir o
   cadastro.
5. Há um link **"Reenviar código"**, caso não chegue.

### Limitações importantes, para saber de antemão

- **Editar um perfil já existente não exige nova verificação** — o
  e-mail/telefone podem ser alterados livremente na edição, sem pedir
  código de novo. Isso foi uma escolha para não travar o uso diário;
  se quiser exigir verificação também na edição, é possível ajustar
  depois.
- **O telefone (WhatsApp) não é verificado de verdade** — só o formato
  é validado (DDD + número). Enviar um código por WhatsApp de verdade
  exigiria aprovação da Meta como empresa (API oficial do WhatsApp
  Business) ou um serviço pago de terceiros (Twilio, por exemplo) —
  isso está fora do escopo deste app.
- **Essa configuração (a URL do Apps Script) precisa ser feita em cada
  aparelho** que for usado para *cadastrar novos servidores* — ela fica
  salva no navegador local, como as demais configurações institucionais
  deste app. Se um aparelho não tiver essa URL configurada, o cadastro
  de novo servidor fica bloqueado com uma mensagem explicando isso (ele
  não deixa criar conta sem verificação).
- O limite de reenvio (60 segundos entre códigos) é uma proteção básica
  contra abuso, mas não é um sistema de segurança robusto — é adequado
  para uso interno institucional, não para um sistema público de larga
  escala.

## Uma repartição nova só existe em um lugar por vez: pendente OU cadastrada

Toda repartição nova nasce **só** como "pendente" — não aparece em
"Repartições cadastradas", nem no seletor de repartição da barra
lateral (esse seletor mostra só as já confirmadas).

**A confirmação acontece direto no card da repartição pendente**, na
tela "Conexões — Repartições": cada card em "Repartições pendentes de
cadastro" tem um botão **"🔌 Conectar e confirmar"**. Ao tocar nele,
o app tenta o login no Google usando o Client ID daquela repartição
específica. Se o login funcionar de verdade, no aparelho de quem
conectou:
- A repartição passa a aparecer em "Repartições cadastradas" e no
  seletor da barra lateral, disponível para todo mundo nesse aparelho
  escolher dali pra frente;
- Ela já fica selecionada/conectada no app, pronta pra uso imediato;
- Na central, ela passa de "pendente" para "confirmada" — mas **sem
  desaparecer** (veja a seção seguinte, sobre outros aparelhos).

Ou seja: uma conexão bem-sucedida é a prova de que a configuração no
Google Cloud (Client ID) e a pasta do Drive estão de verdade
funcionando — só aí a repartição vira uma opção confiável para todos.

### Pendentes/habilitados de uma repartição criada pela tela Conexões

Quando um administrador cadastra uma repartição nova diretamente pela
tela "Conexões — Repartições" (em vez de pelo cadastro de um novo
servidor), ele já entra automaticamente como **pendente** dela — do
mesmo jeito que aconteceria se tivesse se cadastrado normalmente ali.
Ao tocar em **"🔌 Conectar e confirmar"** (seja ele mesmo ou outra
pessoa quem conectar), quem conectou passa a **habilitado** — visível
no modal de edição da repartição, junto com os demais usuários
cadastrados nela.

**Se uma repartição antiga (cadastrada antes desse controle de status
existir) aparecer em "Repartições cadastradas" sem nunca ter sido
testada de verdade**, use o ícone **↩️** no card dela para marcá-la
como pendente novamente — assim ela volta a exigir confirmação real
antes de contar como cadastrada.

### Usando uma repartição já confirmada em outro aparelho

Como "Repartições cadastradas" é uma lista local de cada aparelho, uma
repartição confirmada no celular, por exemplo, não aparece sozinha
como cadastrada no PC. Mas isso não significa que ela "sumiu" — na
tela de Conexões, dentro de "Repartições pendentes de cadastro",
aparece uma seção **"✅ Já confirmadas em outro aparelho"**, listando
essas repartições com um botão **"+ Adicionar a este aparelho"**.

Diferente do fluxo de uma repartição ainda pendente, esse botão **não
pede uma nova conexão OAuth** — já que a configuração (Client ID +
pasta) já foi validada em outro lugar. Ele só copia os dados pra esse
aparelho, deixando a repartição pronta no seletor da barra lateral. A
conexão de verdade (login do Google) continua acontecendo
normalmente, pela primeira vez que alguém tocar em "Conectar" nesse
aparelho especificamente — como já era de costume.

## Atualização grande: relatório em PDF, tela de Conexões, permissões e sidebar

### Relatório em PDF
- Cabeçalho agora mostra a logo + "Custódia Digital" centralizados,
  com o título completo do relatório logo abaixo, também centralizado.
- Subtítulo removido.
- Rodapé em todas as páginas: "EFS Technology ©" à esquerda, "Página X
  de Y" à direita.
- Ajustadas as regras de quebra de página (linhas de tabela e
  parágrafos não são mais cortados no meio ao virar de página).

**Importante:** essas mudanças de PDF não puderam ser testadas
visualmente por mim (o ambiente onde eu testo não tem acesso à
internet para carregar a biblioteca que gera o PDF). O código segue o
padrão documentado da biblioteca, mas **teste a geração de um PDF de
verdade** depois de publicar essa versão, e me avise se o rodapé ou a
quebra de página não saírem como esperado.

### Tela de Conexões reformulada
Título agora é **"Conexões do Sistema"**, com duas seções bem
separadas: **"Conexões de E-mail"** (a configuração de verificação de
e-mail) e **"Conexões de Repartições"** (tudo que já tínhamos:
cadastro, pendentes, cadastradas).

### Gerenciamento de conexões restrito
O botão **"🔗 Gerenciar Repartições"** na barra lateral, e a página que
ele abre, agora só aparecem para dois logins: `fillipe.firmo@gmail.com`
e `efstechnology.app@gmail.com`. Para todos os demais usuários, esse
botão fica oculto — eles continuam podendo normalmente selecionar a
repartição e conectar pela barra lateral, só não acessam a
administração completa (cadastrar/editar/ver pendentes).

### Status de conexão no cabeçalho da Home
Quando conectado a alguma repartição, aparece um texto pequeno logo
abaixo do nome de quem está preenchendo: "Conectado à repartição
[nome] ●" (bolinha verde). Some automaticamente ao desconectar.

### Sidebar reorganizada
- **"Histórico de relatórios"** só aparece quando há conexão ativa com
  uma repartição — e, quando aparece, mostra **só** os relatórios
  enviados àquela repartição específica (trocar de repartição conectada
  também troca o que aparece no histórico).
- **"Editar perfil"** renomeado para **"Editar cadastro"**.
- **"Excluir meu cadastro"** saiu da barra lateral e agora é o último
  botão dentro da própria tela de "Editar cadastro".
- **"Trocar usuário"** renomeado para **"Sair"** (mesma função de
  sempre).

## Seletor da sidebar mostra só o que o usuário logado já conectou

O seletor de repartição da barra lateral agora é **específico de cada
usuário**, não mais um reflexo de tudo que já foi confirmado naquele
aparelho. Antes, num aparelho compartilhado (ou já usado antes por
outra pessoa para testes), qualquer usuário via **todas** as
repartições já confirmadas ali — mesmo sem nunca ter se conectado a
elas.

Agora, cada usuário só vê, no seletor, as repartições que **ele
mesmo** já conectou de verdade — seja a que se cadastrou originalmente
(ao conectar pela primeira vez, pela aba "Conexões" do próprio
perfil), seja qualquer outra adicionada depois, pelo mesmo caminho.

**Enquanto o usuário não tiver nenhuma conexão efetiva**, a barra
lateral mostra só dois botões: **"✏️ Editar Cadastro / Conexões"**
(renomeado, já que é por lá que as conexões são gerenciadas) e
**"↩ Sair"**. O seletor de repartição e o card de status do Drive só
aparecem depois da primeira conexão bem-sucedida. Pra resolver isso, o
caminho é sempre o mesmo: "Editar Cadastro / Conexões" → aba
"Conexões" → tocar em "🔌 Conectar" na repartição desejada.

**Contas já existentes, criadas antes desta atualização**, foram
migradas automaticamente na primeira vez que fizerem login — nenhuma
reconexão manual é necessária para elas.

**Sincronizando o mesmo usuário em outro aparelho novo**: como
"conectadas" é salvo localmente, um aparelho novo (via "📲 Já tenho
cadastro") não saberia, de cara, quais repartições esse usuário já
usa em outros lugares. Por isso, a cada login, o app também busca na
central quais repartições esse e-mail já está **habilitado** de
verdade, e adiciona automaticamente essas ao aparelho novo — sem
exigir uma nova autenticação Google (ele já provou ser legítimo antes,
em outro aparelho). A conexão de verdade com o Google, pra
enviar/baixar arquivos, continua sendo feita normalmente pelo botão
"Conectar" da sidebar, a cada aparelho.

## Novos cargos e campo OAB/UF

O cadastro de usuário agora inclui **"Promotor de Justiça"** e
**"Advogado"** entre as opções de cargo. Ao selecionar "Advogado", o
campo antes chamado "Matrícula funcional" passa a se chamar **"OAB/UF"**
(com um exemplo de formato diferente no campo) — volta ao normal se o
cargo for trocado para qualquer outro.

## Repartição selecionada acompanha automaticamente o login

**Correção estrutural importante:** o vínculo entre um usuário e sua
repartição (e os registros de pendente/habilitado na central) agora
usa o **Client ID** da repartição como identificador, em vez do ID
local gerado em cada aparelho. Antes dessa correção, uma mesma
repartição podia ganhar IDs locais diferentes em cada aparelho (por
exemplo, ao ser excluída e recriada, ou adicionada de forma
independente em cada dispositivo) — e como a central usava esse ID
local pra saber "quem está pendente/habilitado em qual repartição",
isso causava usuários "sumirem" das listas ao trocar de aparelho,
mesmo tendo se conectado com sucesso. Usando o Client ID (que é sempre
o mesmo, não importa o aparelho ou quando a repartição foi cadastrada
localmente), esse problema fica resolvido de forma definitiva.

Cada usuário guarda, no próprio cadastro, a repartição a que pertence
(escolhida no momento do cadastro). A partir desta atualização, sempre
que alguém faz login, o app **corrige automaticamente** o seletor de
repartição da barra lateral para bater com a repartição do próprio
usuário, caso estivesse apontando para outra.

Isso evita um problema real: como o seletor da barra lateral é uma
configuração do **aparelho**, não da pessoa, um aparelho compartilhado
por servidores de repartições diferentes (ou mesmo o mesmo aparelho ao
longo do tempo) poderia ficar com o seletor "preso" na repartição do
último usuário — fazendo com que o próximo usuário mandasse arquivos
para o Drive errado, sem perceber. Agora, cada login já garante que o
envio vai para a repartição certa por padrão.

**Detalhe técnico:** essa correção automática **desconecta** a sessão
do Google Drive anterior, se a repartição mudou — é esperado ter que
tocar em "Conectar" de novo depois de logar com um usuário de uma
repartição diferente da que estava selecionada antes.

## Reorganização do formulário, login e cadastro (mudanças grandes)

### Formulário — campos automáticos e ocultos

- **Seção 1** agora mostra só Nº do relatório, Finalidade e Local da
  coleta. Responsável, Data da coleta e os dois Horários continuam
  preenchidos e presentes no relatório gerado, mas não aparecem mais
  no formulário — são automáticos:
  - **Data e horário de início**: gravados sozinhos no momento em que
    você toca em "📍 Usar localização atual".
  - **Horário de término**: gravado sozinho no momento em que você
    toca em "Gerar relatório".
  - **Responsável pela coleta**: continua vindo do seu cadastro,
    como já era.
- **Seção 2** foi reordenada (Usuário/proprietário → Número da linha →
  Aparelho → Sistema operacional → IMEI) e o campo **"Aplicativo"**
  foi removido (do formulário e do relatório).
- **Seção 9 — Cadeia de Custódia**: o campo "Custódia do dispositivo
  original" agora tem um seletor acima do texto, com duas opções:
  - **"Repartição"** — preenche automaticamente com o nome da
    repartição em que você está conectado no momento.
  - **"Entregue ao usuário/proprietário informado"** — preenche com o
    nome informado no campo "Usuário/proprietário" da Seção 2, **e**
    adiciona, no relatório gerado, um bloco extra logo abaixo da sua
    assinatura: *"Aparelho/dispositivo [nome do aparelho] recebido por
    [nome do proprietário], em ____, às ___h."*, com dois campos em
    branco (data e hora) que podem ser preenchidos diretamente no
    relatório antes de imprimir ou concluir a tarefa, e uma linha para
    a assinatura física de quem recebeu.
  Nos dois casos, o texto preenchido automaticamente continua editável
  manualmente, se precisar ajustar.
- **Seção 10 — Declaração e Assinatura** não aparece mais no
  formulário (já que corresponde aos dados de quem está logado) —
  mas o nome, cargo e matrícula de quem está logado continuam
  aparecendo normalmente no relatório gerado, como sempre.

### Tela de login

- Removido o texto "Identificação do servidor" / "Selecione seu
  cadastro para preencher o relatório".
- O texto abaixo do nome do app agora é o texto completo: "Extração e
  verificação de integridade de arquivos digitais".

### Cadastro de novo servidor — repartição vem primeiro

- Ao cadastrar um novo servidor, agora só aparece, de início, o
  seletor **"Repartição"**. Os demais campos (nome, cargo, matrícula,
  e-mail, telefone) só aparecem depois de uma repartição ser
  escolhida.
- Se a repartição desejada ainda não existir, o seletor tem uma opção
  **"+ Cadastrar repartição"** — escolhendo ela, aparece um mini-
  formulário (nome, e-mail, Client ID, ID da pasta — os mesmos campos
  de "Gerenciar Repartições") acima do restante. Depois de salvar, a
  repartição nova já fica selecionada e os campos de usuário aparecem
  normalmente.
- Repartições criadas dessa forma (pelo cadastro de um novo servidor)
  são automaticamente registradas na aba **"Repartições pendentes de
  cadastro"** (veja abaixo), já com os dados de quem fez o cadastro —
  para o administrador saber quem precisa ser habilitado assim que
  configurar o acesso de verdade no Google Cloud/Drive.

### Conexões — Repartições pendentes de cadastro

Nova seção na tela "Conexões — Repartições", entre "Cadastrar nova
repartição" e "Repartições cadastradas". Mostra, vindo da central
(visível em qualquer aparelho), toda repartição recém-criada — seja
pelo cadastro de um novo servidor, seja pelo próprio formulário
"Cadastrar nova repartição" desta tela — junto com os dados de quem a
cadastrou, quando aplicável. Tem um botão 🗑️ para remover da lista
depois de já ter configurado o acesso manualmente (compartilhamento da
pasta + usuário de teste no Google Cloud). Remover da lista de
pendentes **não** apaga a repartição já cadastrada localmente, se
houver.

## Editar cadastro — abas "Dados pessoais" e "Conexões"

A tela "Editar cadastro" agora tem duas abas:

- **Dados pessoais**: nome, cargo, matrícula, e-mail, telefone e PIN —
  os mesmos campos de sempre.
- **Conexões**: mostra em quais repartições você está cadastrado, com
  o status de cada uma (🕒 Pendente / ✅ Habilitado). Tem um botão
  **"+ Adicionar repartição"**, que mostra um seletor com as
  repartições já conhecidas (cadastradas por qualquer usuário, em
  qualquer aparelho) que você ainda não está cadastrado. Ao escolher
  uma e confirmar, você entra como pendente nela.

  **Cada repartição pendente nessa aba tem um botão "🔌 Conectar"**,
  que permite ao **próprio usuário** — mesmo sem acesso à tela
  administrativa "Gerenciar Repartições" — estabelecer a conexão de
  verdade com os serviços Google dessa repartição, usando o próprio
  e-mail. Ao conectar com sucesso: a repartição passa a ser
  selecionável no seletor da barra lateral desse aparelho, o usuário
  passa a habilitado nela, e (se ainda estivesse pendente) a
  repartição em si é promovida para confirmada na central. Ou seja,
  qualquer usuário comum consegue completar sozinho o ciclo de
  "adicionar repartição → conectar → ficar habilitado", sem depender
  de um administrador.

Isso substitui o antigo campo único "Repartição" na tela de edição —
agora um usuário pode estar vinculado a mais de uma repartição ao
mesmo tempo. O cadastro inicial (primeiro acesso) continua igual,
pedindo a repartição logo de início, antes dos demais campos.

## Nova Seção 1: "Inicialização do Procedimento de Extração"

A antiga Seção 4 ("Procedimento de Cópia") virou a **Seção 1**,
renomeada, e todas as demais seções foram renumeradas a partir dela
(a antiga 1 virou 2, a antiga 2 virou 3, a antiga 3 virou 4 — as
seções 5 a 10 mantiveram os mesmos números, já que ficam depois).

A nova Seção 1 abre com uma ilustração de dispositivos diversos
conectando-se ao computador de custódia digital, seguida do aviso:
"Antes de prosseguir com as demais seções, proceda à conexão entre o
equipamento/servidor de origem e o equipamento de destino, e
transfira/extraia o arquivo original para o equipamento de destino."

O campo **"Método de transferência"** virou um seletor (Cabo USB,
Bluetooth, Wi-Fi Direct/rede local, Cartão de memória, Backup em
nuvem, Conexão direta, Ferramenta forense especializada, Outro) — ao
escolher uma opção, o campo **"Descrição do procedimento"**, logo
abaixo, é preenchido automaticamente com o texto técnico
correspondente àquele método (mas continua livremente editável depois,
caso precise de ajuste fino).

## Seção 2: múltiplos tipos de fonte de extração

A Seção 2 (agora "Identificação da Fonte de Extração") deixou de
assumir que a origem é sempre um celular. No topo, um seletor **"Tipo
de dispositivo de origem"** define quais campos aparecem:

- **📱 Celular / 📲 Tablet**: os campos de sempre (aparelho, sistema
  operacional, linha, IMEI — incluindo os dois IMEIs e o botão de
  salvar manual).
- **💾 HD/SSD externo ou pen drive**: marca/modelo, número de série,
  capacidade, sistema de arquivos, formato de conexão.
- **🖥️ Outro computador**: campos de digitação livre (Nome do
  Dispositivo, ID do Dispositivo, ID do Produto, Sistema operacional,
  tombamento) — **não** usa o cadastro/reaproveitamento da Seção 5,
  de propósito: o computador de destino (Seção 5) é da própria
  repartição e é reutilizado repetidamente em vários relatórios; já um
  computador como fonte de extração normalmente pertence a terceiros
  e aparece pontualmente, sem sentido em cadastrá-lo para reuso.
- **☁️ Servidor em nuvem**: provedor, conta/e-mail associado, método
  de acesso.
- **📡 Roteador / Modem**: marca/modelo, endereço IP, endereço MAC,
  provedor de internet (ISP).
- **Outro**: descrição livre.

"Usuário/proprietário informado" continua sempre visível, para
qualquer tipo. O relatório final mostra só os campos do tipo
escolhido, com o título da seção indicando qual foi ("2. Identificação
da Fonte de Extração — HD/SSD externo ou pen drive", por exemplo).

A legenda do campo "Caminho no dispositivo" (Seção 3) também foi
ajustada, cobrindo instruções específicas por tipo de fonte (Android,
HD/PC, nuvem), além da alternativa via Shift + clique direito no PC.

## Cadastro de equipamentos (Seção 5) por repartição

A Seção 5 do formulário ("Identificação do Computador de Destino")
deixou de começar direto num formulário — agora mostra primeiro um
seletor **"Equipamento"**, com os PCs já cadastrados **nesta
repartição especificamente** (um equipamento cadastrado numa
repartição não aparece para quem estiver conectado a outra).

- Selecionando um equipamento já cadastrado, os campos (nome da
  máquina, número de série, UUID, sistema operacional, número de
  tombamento) aparecem preenchidos automaticamente, em modo somente
  leitura — refletindo fielmente o que está registrado.
- Selecionando **"+ Cadastrar equipamento"**, os mesmos campos
  aparecem vazios e editáveis, com um botão **"💾 Salvar equipamento
  nesta repartição"**. Depois de salvar, o equipamento já fica
  disponível no seletor, inclusive para outros usuários da mesma
  repartição.
- O campo "Usuário logado no sistema" foi removido (desnecessário).

**No modal "Editar repartição"** (tela de Conexões), apareceu uma
nova seção **"💻 Equipamentos cadastrados"**, com um card por
equipamento — mostrando nome, série, UUID, sistema operacional,
tombamento, e quem cadastrou (nome e data/hora) — mesma lógica de
coleta já usada para os cards de usuários.

## Nome da pasta no Drive (em vez do ID cru na frase de custódia)

Ao enviar o arquivo evidência (Seção 9, "☁️ Enviar ao Drive da
repartição"), a frase gerada automaticamente ("Arquivo X, salvo no
Google Drive..., na pasta...") tentava buscar o nome de verdade da
pasta direto no Google Drive — mas essa busca falha quase sempre, já
que a permissão que o app pede (`drive.file`) só alcança arquivos que
o próprio app criou, não a pasta em si (criada manualmente por fora).
Por isso, a frase acabava mostrando o ID cru da pasta como reserva.

**Correção:** agora existe um campo **"Nome dessa pasta no Drive"**
no cadastro de cada repartição (tanto na criação quanto na edição, em
qualquer uma das telas onde isso acontece) — preenchido uma vez,
manualmente, e usado direto na frase, sem depender de nenhuma consulta
ao Google. Repartições já cadastradas antes desta atualização podem
ter esse nome preenchido a qualquer momento, editando a repartição.

## Seção 8 (Anexos): ícone de clipe para anexar o arquivo

Cada linha da lista de anexos agora tem um ícone 📎 ao lado do campo
de descrição — ao tocar, abre o seletor de arquivos do aparelho para
anexar o arquivo referente àquela descrição. O nome do arquivo
anexado aparece logo abaixo, com opção de remover. Esse anexo fica
salvo apenas localmente, como registro para a pessoa preenchendo o
relatório — não é enviado automaticamente a lugar nenhum.

## Formulário: seções únicas, campos novos e retificação

**Navegação por seção única:** o formulário deixou de mostrar todas as
seções de uma vez em rolagem contínua — agora cada seção aparece
sozinha na tela. O botão **"Próxima seção →"** (canto inferior de cada
seção) avança; **"← Seção anterior"** volta. A barra de progresso no
topo reflete o avanço. Ao chegar na última seção, o botão vira "Ir
para revisão final →", que leva à tela com "Gerar relatório (PDF)".

**Campos alterados:**
- **Seção 2**: novo campo "Outro IMEI do mesmo aparelho" (dual-chip) e
  botão "💾 Salvar IMEI digitado", para quem prefere digitar em vez de
  usar a leitura por foto.
- **Seção 4**: campos "Início da transferência" e "Término da
  transferência" removidos.
- **Seção 5**: "Equipamento" renomeado para "Nome da máquina, software
  e versão"; novos campos "Número de série" e "UUID do sistema";
  campo "Pasta de destino da cópia" removido.
- **Seção 6**: novo campo "Data e hora da criação/transferência do
  arquivo", logo após "Tamanho do arquivo copiado" — preenchido
  automaticamente com a data de criação/modificação do arquivo
  anexado nessa seção.
- **Seção 8**: as descrições padrão dos 3 anexos (antes pré-
  preenchidas dentro dos campos, sujeitas a serem apagadas sem querer)
  agora aparecem como legenda abaixo de cada campo — os campos nascem
  vazios, prontos para a descrição específica de cada relatório.

**Retificar antes de enviar:** o relatório gerado agora tem um botão
**"✏️ Retificar formulário"**, ao lado do "✅ Concluir Tarefa" (que
continua funcionando exatamente como antes — envia ao Drive e volta
para a Home). "Retificar formulário" volta para o formulário sem
concluir nem enviar nada, com todos os dados já preenchidos
preservados, pronto para correções antes de gerar o relatório de novo.
Esse botão não aparece ao visualizar um relatório antigo do histórico
(não haveria um formulário atual correspondente para retificar).

## Manuais de cadastro de repartição

Duas formas de consultar o passo a passo de como obter, no Google
Cloud e no Drive, tudo que o app pede para cadastrar uma repartição
nova:

- **Na tela "Conexões — Repartições"** (acesso administrativo): link
  **"📖 Ver manual..."** logo abaixo de "Cadastrar nova repartição" —
  abre uma barra lateral com o passo a passo completo, organizado por
  sistema (Google Cloud Console / Google Drive / outras dicas e erros
  comuns).
- **Na tela de login**, ao escolher "+ Cadastrar repartição": link
  **"📄 Ver manual em PDF..."** — abre um arquivo PDF com o mesmo
  conteúdo, pra quem estiver cadastrando sem acesso à tela
  administrativa.

**Nota honesta:** nenhum dos dois manuais tem capturas de tela reais
da interface do Google — só texto, bem organizado por etapa. A
interface do Google Cloud muda de vez em quando, e não há como gerar
imagens autênticas da tela de terceiros de forma confiável. Se quiser,
dá pra montar uma versão com prints de verdade a partir de capturas de
tela que você mesmo tire.

## Nomenclatura dos arquivos enviados ao Drive

Tanto o arquivo evidência (Seção 9) quanto o relatório completo agora
são enviados ao Drive com um prefixo de duas letras — as iniciais do
primeiro e do último nome de quem está enviando. Exemplo: "Fillipe
Amorim Firmo da Silva" enviando um arquivo chamado `chat.txt` vira
`FS - chat.txt`; o relatório completo vira algo como
`FS - Relatorio_NUMERO_timestamp.pdf`.

## Histórico de relatórios: link também pro arquivo evidência

Além do link "🔗 Abrir relatório no Drive" (o PDF completo), o
histórico local agora também mostra "🔗 Abrir arquivo digital no
Drive", quando o arquivo evidência da Seção 9 foi enviado com sucesso
antes de concluir a tarefa. Os dois links são independentes — cada um
aponta pro arquivo certo no Drive da repartição.

## Nova aba "Usuários cadastrados" (tela de Conexões)

A tela "Conexões — Repartições" agora tem duas abas: **"Conexões do
Sistema"** (tudo que já existia, sem mudanças) e **"Usuários
cadastrados"** — uma visão de todos os usuários já cadastrados no
sistema, em qualquer repartição, com seus respectivos status.

Cada card mostra: foto, nome completo, cargo/e-mail e data de
cadastro, além de um ícone 🗑️ para excluir o acesso desse usuário ao
app por completo (em todas as repartições de uma vez).

Tocar num card abre um modal com:
- **Dados pessoais completos** (nome, e-mail, telefone, data de
  cadastro).
- **Repartições**, com o status de cada uma (🕒 Pendente / ✅
  Habilitado / ⛔ Excluído) e a data desde quando esse status vale.
- **Histórico de acesso ao app** — as últimas 10 vezes que esse
  usuário fez login, em qualquer aparelho.
- **Histórico de relatórios enviados** — os últimos 10 relatórios,
  com data, repartição e link direto pro arquivo no Drive.

**Sobre a exclusão:** ela é "suave" — o cadastro não é apagado de
verdade, só marcado como excluído (preservando o histórico para
consulta futura). A pessoa excluída deixa de conseguir usar o sistema
em qualquer repartição, mas o registro de que ela existiu, e desde
quando foi excluída, continua disponível no modal.

## Repartição e habilitação de novos usuários

Desde esta atualização, o cadastro de um novo servidor pede também a
**repartição** a que ele está vinculado (escolhida numa lista suspensa,
igual às cadastradas em "🔗 Gerenciar Repartições"). Essa informação —
junto com nome, cargo, e-mail e matrícula — é enviada para uma **central
compartilhada**, para que o administrador consiga ver, em qualquer
aparelho, quem se cadastrou e habilitar o acesso de cada um.

### Por que isso precisa de uma peça a mais (e por que já a temos)

Este app não tem servidor/banco de dados próprio — cada celular guarda
os dados de cadastro só localmente. Sem uma peça central, o cadastro de
alguém em um celular nunca apareceria no celular de outra pessoa. A
solução foi estender o **mesmo Google Apps Script** já usado para a
verificação de e-mail, adicionando a ele uma pequena "central de
cadastros": o script cria automaticamente uma Planilha do Google
(chamada "Custodia Digital - Usuarios Cadastrados") na conta que o
publicou, e passa a guardar ali a lista de servidores por repartição.

### Se você já tinha publicado o Apps Script antes desta atualização

**É necessário atualizar o script publicado**, porque o arquivo
`Codigo_Apps_Script_Verificacao_Email.gs` ganhou código novo. O passo a
passo (a URL final continua a mesma, não precisa mudar nada no app):

1. Acesse [script.google.com](https://script.google.com) e abra o
   projeto já existente.
2. Apague todo o conteúdo do arquivo `Código.gs` e cole o conteúdo
   atualizado (está no pacote).
3. Salve.
4. Toque em **"Implantar" → "Gerenciar implantações"**.
5. Toque no ícone de lápis (editar) na implantação já existente.
6. Em **"Versão"**, escolha **"Nova versão"**.
7. Toque em **"Implantar"**.
   **Importante:** use "Gerenciar implantações" e edite a implantação
   já existente — não crie uma implantação nova do zero, ou a URL muda
   e o app para de reconhecer a configuração salva.
8. Na primeira vez que uma ação nova rodar, o Google pode pedir para
   autorizar uma permissão adicional (acesso ao Google Sheets) — aceite.

### Como fica o fluxo, na prática

1. Um novo servidor se cadastra normalmente, agora escolhendo também a
   repartição.
2. Depois de confirmar o código por e-mail e criar o PIN, o cadastro
   dele já funciona **localmente**, no aparelho dele — ele já consegue
   preencher e gerar relatórios normalmente.
3. Em paralelo, esse cadastro é enviado para a central (planilha),
   marcado como **pendente de habilitação**.
4. O administrador (você) abre **"🔗 Gerenciar Repartições"** → toca em
   ✏️ na repartição correspondente → vê duas listas:
   - **Pendentes de habilitação**: quem se cadastrou mas ainda não tem
     acesso liberado ao Google Cloud/Drive da repartição.
   - **Habilitados**: quem já tem acesso, com a data em que foi
     habilitado.
5. Habilitar alguém no app (botão "✓ Marcar como habilitado") é só um
   **registro informativo** — isso não dá acesso de verdade sozinho. O
   acesso de verdade continua exigindo os dois passos manuais de
   sempre, feitos por fora do app:
   - Compartilhar a pasta do Drive da repartição com o e-mail da
     pessoa, com permissão de "Editor";
   - Adicionar o e-mail dela como "usuário de teste" na tela de
     consentimento OAuth do Google Cloud (necessário enquanto o app
     estiver em modo de teste — veja mais abaixo).
   Toque em "Marcar como habilitado" **depois** de já ter feito esses
   dois passos no Google, para manter a lista do app refletindo a
   realidade.
6. O botão 🔄 atualiza a lista, útil se outra pessoa também estiver
   gerenciando cadastros ao mesmo tempo.

### Usuários já cadastrados antes desta atualização

Servidores que já existiam antes dessa mudança são automaticamente
vinculados à repartição **"Servidor EFS Technology"** (a primeira
cadastrada), só localmente, para não quebrar o cadastro deles — isso
acontece sozinho, sem nenhuma ação necessária. Eles **não** aparecem
retroativamente nas listas de pendentes/habilitados da central, porque
já tinham acesso funcionando antes dessa funcionalidade existir.

### Sobre o modo "Teste" do Google Cloud

Enquanto o projeto do Google Cloud estiver no modo "Teste" (que é onde
recomendamos manter, veja a conversa anterior sobre isso), cada novo
usuário precisa ser adicionado manualmente como "usuário de teste" na
tela de consentimento OAuth — sem isso, o login dele é bloqueado pelo
próprio Google com "Erro 403: access_denied", mesmo que a pasta do
Drive já esteja compartilhada corretamente com ele. Esse modo permite
até 100 usuários cadastrados dessa forma.

### Habilitação automática ao conectar

Além do botão manual "✓ Marcar como habilitado", o app agora também
tenta marcar automaticamente como habilitado quando o **próprio
usuário** consegue conectar ao Google Drive pela primeira vez (botão
"Conectar" na barra lateral). Isso poupa um passo do administrador na
maioria dos casos.

**Limitação a saber:** uma conexão bem-sucedida só confirma que o
e-mail já foi adicionado como "usuário de teste" no Google Cloud — o
primeiro dos dois passos manuais. Não confirma que a pasta do Drive já
foi compartilhada com esse e-mail (o segundo passo), já que isso só é
testado de verdade na hora de enviar um arquivo. Ou seja: é possível
que alguém apareça como "✅ Habilitado" e ainda assim receba erro ao
tentar enviar, se faltar o compartilhamento da pasta. Nesses casos, o
botão manual continua disponível para corrigir/reverter, e o
compartilhamento da pasta continua sendo um passo separado, sempre
necessário.

## Entrar em outro aparelho sem recadastrar tudo

Na tela de login, o link **"📲 Já tenho cadastro (entrar em outro
aparelho)"** permite recuperar nome, cargo, matrícula e repartição de
um cadastro já existente na central — sem precisar redigitar tudo.

### Como funciona

1. Informe o e-mail já cadastrado.
2. Se for encontrado na central, um código de verificação é enviado
   por e-mail (o mesmo mecanismo do cadastro).
3. Depois de confirmar o código, o app mostra o perfil encontrado
   (nome, cargo, matrícula, repartição) e pede para **criar um PIN
   novo — específico deste aparelho**.
4. Pronto — já entra logado, sem precisar do fluxo completo de
   cadastro de novo.

### Por que o PIN precisa ser recriado a cada aparelho

A planilha central **nunca guarda o PIN** — de propósito, por
segurança (se guardasse, qualquer pessoa com acesso à planilha veria o
PIN de todo mundo). O PIN é sempre uma trava local, específica de cada
aparelho; só os dados de identificação (nome, cargo, matrícula,
repartição) são recuperados da central.

## Foto de perfil e histórico de relatórios entre aparelhos

Desde esta atualização, tanto a **foto de perfil** quanto o **histórico
de relatórios enviados ao Drive** acompanham o usuário para qualquer
aparelho em que ele entrar — não ficam mais presos a um único celular.

### Foto de perfil

- Ao trocar a foto (menu ☰ → toque no círculo do avatar), o app já
  comprime a imagem automaticamente antes de salvar (fica bem leve,
  poucos KB) e envia essa foto para a central, além de salvar
  localmente.
- Ao entrar num aparelho onde esse usuário ainda não tinha foto salva
  (por exemplo, depois de usar "📲 Já tenho cadastro"), o app busca a
  foto automaticamente da central e já mostra ela.

### Histórico de relatórios enviados ao Drive

A tela **"Histórico de relatórios"** mostra uma lista única, mesclando
duas fontes:

1. **Relatórios gerados neste aparelho** — vêm do armazenamento local,
   com todos os detalhes (dá pra reabrir e reimprimir sem internet).
2. **Relatórios enviados de outro aparelho** — vêm da central (a
   planilha alimentada automaticamente a cada "✅ Concluir Tarefa" bem-
   sucedido). Esses aparecem com a marcação **"📱 Enviado de outro
   aparelho"**, só com os dados básicos (número, arquivo, data) e o
   link **"🔗 Abrir no Drive"** — não há conteúdo local pra reabrir/
   reimprimir nesse caso, já que o relatório foi gerado em outro
   celular ou computador.

O app evita duplicar: se um relatório já aparece no histórico local
(mesmo link do Drive), ele não é repetido como "de outro aparelho".

### Selo de envio ao Drive no histórico local

Cada relatório listado no histórico agora mostra um selo:
- **"☁️ Enviado ao Drive"** (verde) — o envio ao Drive da repartição
  deu certo ao concluir aquela tarefa. Logo abaixo, aparece também um
  link separado **"🔗 Abrir no Drive"**, que abre o arquivo de verdade
  direto no Google Drive.
- **"☁️ Não enviado ao Drive"** (cinza) — por algum motivo o envio não
  aconteceu (sem conexão no momento, falha de rede, repartição sem
  Client ID/pasta configurados, etc.). O relatório continua salvo
  normalmente neste aparelho, só não foi parar no Drive.

Isso ajuda a identificar rapidamente relatórios que precisam ser
reenviados manualmente (reabrindo o relatório e reenviando pela Seção 9,
por exemplo), sem precisar adivinhar o que já chegou à repartição.

## Conexão obrigatória antes de iniciar o formulário

A partir desta atualização, a tela inicial (Home) só mostra o botão
**"▶️ Iniciar Formulário"** depois que o usuário estiver **conectado ao
Google Drive** naquela sessão. Enquanto não conectado, aparece no lugar
o botão **"🔒 Conecte-se à repartição"**, que abre a barra lateral
diretamente no botão "Conectar" — bastando um toque a mais para
completar a conexão e liberar o formulário.

Isso evita a situação de alguém preencher todo o relatório e só
descobrir na hora de gerar/enviar que esqueceu de conectar. Como a
conexão dura só enquanto a página estiver aberta (token expira em
cerca de 1h, ou some ao fechar/recarregar o app — veja a seção sobre
conexão "permanente" mais abaixo), o botão "Conecte-se à repartição"
pode voltar a aparecer depois de um tempo, mesmo que a pessoa já
tivesse conectado antes naquele mesmo dia — isso é esperado.

## Novo fluxo: Home → Formulário → Concluir Tarefa

O app agora tem uma tela inicial ("Home") separada do formulário:

1. Ao entrar/logar, você cai na Home — só a logo, o título do app e o
   botão **"▶️ Iniciar Formulário"**.
2. Tocar nesse botão abre o formulário completo (Seções 1 a 10).
3. Ao gerar o relatório (PDF), o botão que antes dizia "Voltar para
   edição" agora é **"✅ Concluir Tarefa"**. Ao tocar nele:
   - O relatório preenchido é salvo no **histórico** do servidor;
   - O relatório é convertido em arquivo (PDF, ou HTML como alternativa
     se a geração de PDF não estiver disponível) e enviado
     automaticamente para a pasta do **Google Drive já conectada**
     (é necessário estar conectado — veja a seção sobre o Drive mais
     abaixo);
   - O formulário é limpo e o app volta para a Home, pronto para uma
     nova tarefa.
4. Reabrir um relatório pelo **Histórico** mostra o botão
   **"← Voltar ao histórico"** em vez de "Concluir Tarefa" — reabrir um
   relatório já concluído não deve reenviá-lo ao Drive nem duplicá-lo
   no histórico.

## Múltiplas repartições — conexões com o Google Drive

O app agora suporta **mais de uma repartição de destino**, cada uma com
seu próprio Client ID (Google Cloud) e pasta compartilhada no Drive.

### Cadastrando uma repartição

1. Menu ☰ → **"🔗 Gerenciar Repartições"**.
2. Toque no **"+"** ao lado de "Cadastrar nova repartição" para abrir o
   formulário (ele fica escondido por padrão, para não poluir a tela).
3. Preencha: **Nome da repartição** (ex.: "14ª Delegacia de Polícia"),
   **E-mail do Cloud/Drive da repartição** (obrigatório — o e-mail da
   conta Google associada àquele Cloud/Drive institucional), **Client
   ID** e **ID da pasta compartilhada** — os dois últimos são obtidos
   do Google Cloud Console e do Google Drive, como já explicado nas
   seções anteriores deste documento.
4. Toque em **"Salvar repartição"**. O formulário se fecha sozinho, e
   ela passa a aparecer na lista (só pelo nome) e também no seletor da
   barra lateral.
5. Repita para quantas repartições forem necessárias. Cada uma pode ter
   um Client ID diferente (ou o mesmo, se compartilharem o projeto do
   Google Cloud) e uma pasta de destino diferente.
6. Na lista, cada repartição mostra só o nome, com dois ícones ao lado:
   ✏️ abre um painel para editar (nome, e-mail, Client ID e pasta), e
   🗑️ exclui direto (com confirmação).

### Escolhendo para onde enviar

No menu ☰, o campo **"Selecione a repartição de destino:"** mostra só
os nomes cadastrados (nunca o Client ID ou o ID da pasta). Ao trocar de
repartição nesse seletor, a conexão anterior é encerrada automaticamente
— é necessário tocar em **"Conectar"** de novo, agora para a nova
repartição escolhida.

### Como o envio usa isso

Os botões **"☁️ Enviar ao Drive da repartição"** (Seção 9) e o envio
automático do relatório ao concluir uma tarefa sempre usam a
**repartição atualmente selecionada** na barra lateral — nem o Client
ID nem o ID da pasta aparecem em nenhum lugar do formulário, só o nome
escolhido.

## Envio para o Google Drive: como conectar e usar

1. Cadastre (ou use a já pré-cadastrada) uma repartição — veja
   "Múltiplas repartições" acima.
2. No menu ☰, escolha-a no seletor **"Selecione a repartição de
   destino:"**.
3. Toque em **"Conectar"** — na primeira vez, o Google vai pedir para
   escolher a conta e autorizar o acesso.
4. Pronto: o cartão muda para **"🟢 Conectado ao Google Drive"**, e o
   botão vira **"Desconectar"**.
5. Anexe o arquivo copiado na **Seção 6**, vá até a **Seção 9** e toque
   em **"☁️ Enviar ao Drive da repartição"**, ao lado de "Custódia da
   cópia digital".
6. Ao concluir o envio, o app preenche automaticamente o campo de texto
   com uma frase de registro, no formato:
   *"Arquivo msgstore.db.crypt14, salvo no Google Drive da 14ª
   Delegacia de Polícia, na pasta Evidências_2026, em 02/09/2026, às
   14h30."*
   Isso já entra no relatório final gerado — não precisa digitar nada
   manualmente.

### Sobre a conexão "permanente"

O login com o Google só é pedido quando o servidor toca explicitamente em
**"Conectar"** na barra lateral — nunca automaticamente, nem ao abrir o
menu ☰, nem ao usar os botões "Enviar ao Drive da repartição" ou
"Concluir Tarefa". Esses dois botões **reaproveitam** a conexão feita
pelo "Conectar"; se não houver nenhuma conexão ativa no momento, eles
mostram uma mensagem clara pedindo para conectar primeiro pela barra
lateral — e não tentam logar sozinhos.

Na prática, isso significa que a sessão do Google dura enquanto o token
de acesso estiver válido (geralmente por volta de uma hora, ou até a
página ser recarregada/fechada) — depois disso, basta tocar em
"Conectar" de novo. Trocar de repartição no seletor também encerra a
conexão atual, exigindo reconectar para a nova escolhida. Isso é uma
limitação do próprio sistema de login do Google para aplicativos sem
servidor próprio (sem servidor, não é possível manter uma sessão
"para sempre" sem pedir novo consentimento de vez em quando) — não é
um defeito do app, e a alternativa (tentar renovar sozinho em segundo
plano) foi testada e descartada, porque o Google às vezes exibe a
tela de login mesmo em modo "silencioso", dando a impressão de que o
app estava pedindo login por conta própria.

### O que isso NÃO faz

- Não dá ao app acesso a todo o Google Drive da conta — o escopo usado
  (`drive.file`) só permite acesso aos arquivos que o próprio app criar,
  não a outros arquivos/pastas da conta.
- Não funciona sem internet (ao contrário do cálculo do hash, que é
  local) — enviar para o Drive depende de conexão, já que é uma chamada
  para os servidores do Google.
- Enquanto nenhuma repartição estiver conectada, o botão de envio
  recorre ao menu de compartilhamento nativo do Android, permitindo
  salvar manualmente no app do Drive.

### Cuidado institucional

Enviar o arquivo original de extração (com conteúdo de conversas) para o
Drive cria uma nova cópia da evidência fora do celular/PC já registrados
no relatório. Trate essa cópia com o mesmo cuidado de cadeia de custódia
descrito na Seção 9 do relatório.

## Cálculo automático de hash a partir do arquivo anexado

Nas seções 3 e 6, há um botão "📎 Selecionar arquivo" opcional. Ao anexar o
arquivo (original no celular, ou a cópia no PC), o app calcula o hash
SHA-256 automaticamente, além de preencher nome, tamanho e data de
modificação. O cálculo usa uma função nativa do navegador (Web Crypto API):
o conteúdo do arquivo é processado inteiramente no aparelho e nunca é
enviado para a internet ou para qualquer servidor — nem mesmo para os
desenvolvedores deste app. Isso não depende de internet e não depende do
app estar hospedado em `https://` (funciona mesmo testando o arquivo local).
Preencher manualmente continua funcionando normalmente, para quem preferir
copiar o valor de outro terminal/app.

## Foto de perfil

A foto adicionada na barra lateral fica salva apenas no aparelho (dentro do
armazenamento local do navegador), junto com o cadastro do servidor. Trocar
de aparelho ou limpar os dados do navegador apaga a foto e exige novo envio.

## Como hospedar (necessário para instalar em outros celulares)

O Chrome só oferece a opção de "instalar" o PWA (com funcionamento offline
completo) quando os arquivos estão em um endereço `https://`. Abrir o
`index.html` direto do armazenamento do celular funciona para testar o
formulário, mas não ativa a instalação nem o modo offline.

**Opção mais simples — GitHub Pages (gratuito):**
1. Crie uma conta em github.com, se ainda não tiver.
2. Crie um repositório novo (pode ser privado).
3. Faça upload dos 5 arquivos deste pacote para o repositório.
4. Em "Settings" → "Pages", ative o GitHub Pages apontando para a branch
   principal.
5. O GitHub fornecerá um endereço do tipo
   `https://seu-usuario.github.io/nome-do-repositorio/`.
6. Abra esse endereço no Chrome do celular Android.

**Opção institucional:** se o TRE-PB tiver um servidor web interno (mesmo
uma pasta simples servida por HTTPS), basta colocar os 5 arquivos lá — o
resultado é o mesmo, e os dados não saem da rede interna.

## Como instalar no Android depois de hospedado

1. Abra o endereço `https://...` no Google Chrome do celular.
2. Toque no menu (⋮) no canto superior direito.
3. Toque em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. Confirme. Um ícone do app aparecerá na tela inicial do celular, como
   qualquer outro aplicativo.
5. Repita esse processo em cada celular onde o app deve ficar instalado —
   não é necessário nenhum cadastro em loja de aplicativos.

## Uso diário

1. Abrir o app pelo ícone instalado.
2. Selecionar o servidor cadastrado (ou cadastrar um novo, na primeira vez)
   e informar o PIN.
3. Preencher as seções do formulário (as legendas "Como localizar"
   orientam onde encontrar cada informação no aparelho/computador).
4. Conferir a comparação automática de hash na Seção 7.
5. Tocar em **"Gerar relatório (PDF)"**.
6. Tocar em **"Salvar/Imprimir PDF"** e, na caixa de impressão do sistema,
   escolher "Salvar como PDF".
7. Encaminhar o PDF gerado para assinatura/juntada ao processo.
