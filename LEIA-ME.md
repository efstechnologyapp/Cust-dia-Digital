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

## Envio automático para o Google Drive da repartição

O app pode enviar o arquivo anexado (o original extraído do celular, ou a
cópia no PC) direto para uma pasta fixa do Google Drive institucional,
sem precisar passar pelo menu de compartilhar do celular. Isso exige uma
configuração única, feita por alguém com acesso ao Google Cloud da
repartição (normalmente o TI).

### Passo a passo para configurar (feito uma vez, pelo TI)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) com
   a conta institucional (Google Workspace do TRE-PB, se houver).
2. Crie um projeto novo (ou use um existente).
3. No menu, vá em **"APIs e serviços" → "Biblioteca"**, procure por
   **"Google Drive API"** e clique em **Ativar**.
4. Vá em **"APIs e serviços" → "Tela de consentimento OAuth"**:
   - Tipo de usuário: escolha **"Interno"** (só aparece essa opção se a
     conta pertencer a um Google Workspace institucional — isso restringe
     o uso a contas @tre-pb.jus.br, sem precisar de revisão do Google).
   - Preencha nome do app, e-mail de suporte e salve.
5. Vá em **"APIs e serviços" → "Credenciais" → "Criar credenciais" →
   "ID do cliente OAuth"**:
   - Tipo de aplicativo: **"Aplicativo da Web"**.
   - Em **"Origens JavaScript autorizadas"**, adicione o endereço
     `https://...` onde este app está hospedado (o mesmo do GitHub Pages
     ou do servidor interno).
   - Clique em **Criar**. Copie o **Client ID** gerado (algo como
     `123456789-abc123.apps.googleusercontent.com`).
6. No Google Drive, crie (ou escolha) a pasta institucional de destino,
   abra ela e copie o **ID da pasta**: é o trecho final da URL, depois de
   `/folders/` — por exemplo, em
   `https://drive.google.com/drive/folders/1A2b3C4d5E6f`, o ID é
   `1A2b3C4d5E6f`.
7. Compartilhe essa pasta com as contas dos servidores que vão usar o
   app (ou deixe acessível a todo o domínio institucional), com permissão
   de "Editor", para que o envio de arquivos funcione.

### Como usar, depois de configurado

1. No app, abra o menu ☰ → **"Configurar Google Drive"**.
2. Cole o **Client ID**, o **ID da pasta da repartição** e/ou o **ID da
   pasta do MP** obtidos acima → **Salvar configuração**. Pode preencher
   só uma das pastas, se só precisar de um destino.
3. Anexe o arquivo copiado na **Seção 6** (é esse arquivo que os botões
   da Seção 9 enviam).
4. Na **Seção 9 — Cadeia de Custódia**, use os botões ao lado dos
   títulos:
   - **"☁️ Enviar ao Drive da repartição"**, ao lado de "Custódia da
     cópia digital";
   - **"☁️ Enviar ao Drive do MP"**, ao lado de "Cópia adicional
     entregue a".
5. Ao concluir o envio, o app preenche automaticamente o campo de texto
   correspondente com uma frase de registro, no formato:
   *"Arquivo msgstore.db.crypt14, salvo no Google Drive do MP, na pasta
   Evidências_2026, em 02/09/2026, às 14h30."*
   Isso já entra no relatório final gerado — não precisa digitar nada
   manualmente.
6. No primeiro uso, o Google vai pedir para o servidor fazer login e
   autorizar o acesso à pasta (usando a conta institucional). Nos usos
   seguintes, isso costuma ficar mais rápido, mas o Google pode pedir
   confirmação de novo periodicamente — é o comportamento normal do
   OAuth do Google, não é um defeito do app.
7. A pasta do MP precisa estar compartilhada (com permissão de edição)
   com a conta Google que o servidor usar para fazer login — geralmente
   isso é combinado previamente entre as duas instituições.

### O que isso NÃO faz

- Não faz upload automático "no fundo" sem o servidor perceber — sempre
  exige login/autorização do Google na primeira vez de cada sessão.
- Não dá ao app acesso a todo o Google Drive da conta — o escopo usado
  (`drive.file`) só permite acesso aos arquivos que o próprio app criar,
  não a outros arquivos/pastas da conta.
- Não funcina sem internet (ao contrário do cálculo do hash, que é
  local) — enviar para o Drive depende de conexão, já que é uma chamada
  para os servidores do Google.
- Enquanto uma das pastas não estiver configurada, o respectivo botão
  fica com o rótulo **"📤 Compartilhar (Drive não configurado)"**, que
  tenta usar o menu de compartilhamento nativo do Android (inclui
  "Salvar no Drive" manualmente, se o app do Drive estiver instalado) —
  funciona sem nenhuma configuração prévia.
- Os dois botões agem sobre o arquivo anexado na **Seção 6** (a cópia no
  PC) — anexe-o antes de usar os botões da Seção 9.

### Cuidado institucional

Enviar o arquivo original de extração (com conteúdo de conversas) para o
Drive cria uma nova cópia da evidência fora do celular/PC já registrados
no relatório. Trate essa cópia com o mesmo cuidado de cadeia de custódia
descrito na Seção 9 do relatório — vale registrar ali que uma cópia
adicional foi enviada ao Drive institucional, se for o caso.

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
