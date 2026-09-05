/**
 * Custódia Digital — Verificação de e-mail + registro de usuários por repartição
 *
 * Como publicar/atualizar (passo a passo completo no LEIA-ME.md):
 * 1. Acesse script.google.com e abra o projeto já existente
 *    ("Verificacao Custodia Digital").
 * 2. Apague TODO o conteúdo do arquivo Código.gs e cole este arquivo
 *    inteiro no lugar.
 * 3. Salve (ícone de disquete).
 * 4. Implantar → Gerenciar implantações → ícone de lápis (editar) na
 *    implantação existente → em "Versão", escolha "Nova versão" →
 *    Implantar.
 *    IMPORTANTE: use "Gerenciar implantações" e edite a implantação
 *    já existente, para a URL continuar a mesma — não crie uma nova
 *    implantação do zero, ou o app vai parar de reconhecer a URL
 *    salva.
 * 5. Na primeira vez que uma ação nova for usada, o Google pode pedir
 *    para autorizar novas permissões (acesso ao Google Sheets) — aceite.
 *
 * Este script cria automaticamente, na primeira vez que for necessário,
 * uma Planilha do Google chamada "Custodia Digital - Usuarios
 * Cadastrados" na conta que publicou o script, para guardar a lista de
 * servidores cadastrados por repartição.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'send' || action === 'verify' || action === 'register_user') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) {
        return respond({ ok: false, error: 'E-mail não informado.' });
      }
    }

    var cache = CacheService.getScriptCache();

    // ---------- verificação de e-mail (código) ----------
    if (action === 'send') {
      var email = (data.email || '').trim().toLowerCase();
      var cooldownKey = 'cooldown_' + email;
      if (cache.get(cooldownKey)) {
        return respond({ ok: false, error: 'Aguarde um minuto antes de solicitar um novo código.' });
      }

      var code = String(Math.floor(100000 + Math.random() * 900000));
      cache.put('code_' + email, code, 600); // código válido por 10 minutos
      cache.put(cooldownKey, '1', 60);        // cooldown de reenvio de 60 segundos

      MailApp.sendEmail({
        to: email,
        subject: 'Código de verificação — Custódia Digital',
        body:
          'Seu código de verificação é: ' + code + '\n\n' +
          'Este código expira em 10 minutos.\n\n' +
          'Se você não solicitou este cadastro, ignore este e-mail.'
      });

      return respond({ ok: true });
    }

    if (action === 'verify') {
      var email = (data.email || '').trim().toLowerCase();
      var code = (data.code || '').trim();
      var storedCode = cache.get('code_' + email);

      if (!storedCode) {
        return respond({ ok: false, error: 'Código expirado. Solicite um novo.' });
      }
      if (storedCode !== code) {
        return respond({ ok: false, error: 'Código incorreto.' });
      }

      cache.remove('code_' + email);
      return respond({ ok: true });
    }

    // ---------- registro de usuário por repartição ----------
    if (action === 'register_user') {
      var email = (data.email || '').trim().toLowerCase();
      var jaHabilitado = data.habilitado === true;
      var sheet = getOrCreateUsersSheet();
      sheet.appendRow([
        data.nome || '',
        email,
        data.cargo || '',
        data.matricula || '',
        data.reparticaoId || '',
        data.reparticaoNome || '',
        jaHabilitado,
        jaHabilitado ? new Date() : '',
        new Date()
      ]);
      return respond({ ok: true });
    }

    if (action === 'list_users') {
      var reparticaoId = String(data.reparticaoId || '');
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      var pendentes = [];
      var habilitados = [];

      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[4]) !== reparticaoId) continue;
        var user = {
          rowIndex: i + 1,
          nome: r[0],
          email: r[1],
          cargo: r[2],
          matricula: r[3],
          habilitado: !!r[6],
          habilitadoEm: r[7] ? formatDate_(r[7]) : ''
        };
        if (user.habilitado) habilitados.push(user);
        else pendentes.push(user);
      }

      return respond({ ok: true, pendentes: pendentes, habilitados: habilitados });
    }

    if (action === 'enable_user') {
      var rowIndex = Number(data.rowIndex);
      if (!rowIndex || rowIndex < 2) {
        return respond({ ok: false, error: 'Registro inválido.' });
      }
      var sheet = getOrCreateUsersSheet();
      sheet.getRange(rowIndex, 7).setValue(true);       // coluna "Habilitado"
      sheet.getRange(rowIndex, 8).setValue(new Date());  // coluna "HabilitadoEm"
      return respond({ ok: true });
    }

    // marca automaticamente como habilitado quando o próprio usuário
    // conecta com sucesso ao Google Drive (chamado pelo app, não exige
    // e-mail no formato do bloco de validação geral, por isso trata aqui
    // separadamente e sempre responde ok, mesmo se não encontrar nada)
    if (action === 'auto_enable') {
      var email = (data.email || '').trim().toLowerCase();
      var reparticaoId = String(data.reparticaoId || '');
      if (!email || !reparticaoId) {
        return respond({ ok: true });
      }
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[4]) === reparticaoId && String(r[1]).toLowerCase() === email && !r[6]) {
          sheet.getRange(i + 1, 7).setValue(true);
          sheet.getRange(i + 1, 8).setValue(new Date());
          break;
        }
      }
      return respond({ ok: true });
    }

    return respond({ ok: false, error: 'Ação inválida.' });

  } catch (err) {
    return respond({ ok: false, error: 'Erro no servidor: ' + err.message });
  }
}

function getOrCreateUsersSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('USERS_SHEET_ID');
  var ss = null;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('Custodia Digital - Usuarios Cadastrados');
    props.setProperty('USERS_SHEET_ID', ss.getId());
    var sheet = ss.getSheets()[0];
    sheet.setName('Usuarios');
    sheet.appendRow(['Nome', 'Email', 'Cargo', 'Matricula', 'ReparticaoId', 'ReparticaoNome', 'Habilitado', 'HabilitadoEm', 'DataCadastro']);
    return sheet;
  }

  return ss.getSheetByName('Usuarios') || ss.getSheets()[0];
}

function formatDate_(d) {
  try {
    return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return String(d);
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
