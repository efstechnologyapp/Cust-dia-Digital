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
7. No app, na tela de login, toque em **"⚙️ Configurar verificação de
   e-mail"**, cole essa URL e toque em **Salvar**.

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
