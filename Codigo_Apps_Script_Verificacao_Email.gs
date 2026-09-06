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

    if (action === 'send' || action === 'verify' || action === 'register_user' || action === 'get_user') {
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
      var reparticaoId = data.reparticaoId || '';
      var foto = data.foto || '';
      var telefone = data.telefone || '';
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();

      // procura um cadastro já existente com o mesmo e-mail + repartição,
      // para atualizar em vez de duplicar
      var existingRow = -1;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email && String(rows[i][4]) === String(reparticaoId)) {
          existingRow = i + 1;
          break;
        }
      }

      if (existingRow > 0) {
        var jaEstavaHabilitado = !!rows[existingRow - 1][6];
        sheet.getRange(existingRow, 1).setValue(data.nome || '');
        sheet.getRange(existingRow, 3).setValue(data.cargo || '');
        sheet.getRange(existingRow, 4).setValue(data.matricula || '');
        sheet.getRange(existingRow, 6).setValue(data.reparticaoNome || '');
        // nunca "desabilita" quem já estava habilitado; só habilita se pedido e ainda não estava
        if (jaHabilitado && !jaEstavaHabilitado) {
          sheet.getRange(existingRow, 7).setValue(true);
          sheet.getRange(existingRow, 8).setValue(new Date());
        }
        // só sobrescreve a foto se uma nova foi enviada; preserva a existente caso contrário
        if (foto) {
          sheet.getRange(existingRow, 10).setValue(foto);
        }
        if (telefone) {
          sheet.getRange(existingRow, 11).setValue(telefone);
        }
        return respond({ ok: true, updated: true });
      }

      sheet.appendRow([
        data.nome || '',
        email,
        data.cargo || '',
        data.matricula || '',
        reparticaoId,
        data.reparticaoNome || '',
        jaHabilitado,
        jaHabilitado ? new Date() : '',
        new Date(),
        foto,
        telefone
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
          nome: String(r[0]),
          email: String(r[1]),
          cargo: String(r[2]),
          matricula: String(r[3]),
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

    if (action === 'remove_user') {
      var rowIndex = Number(data.rowIndex);
      if (!rowIndex || rowIndex < 2) {
        return respond({ ok: false, error: 'Registro inválido.' });
      }
      var sheet = getOrCreateUsersSheet();
      sheet.deleteRow(rowIndex);
      return respond({ ok: true });
    }

    // marca automaticamente como habilitado quando o próprio usuário
    // conecta com sucesso ao Google Drive (chamado pelo app, não exige
    // e-mail no formato do bloco de validação geral, por isso trata aqui
    // separadamente e sempre responde ok, mesmo se não encontrar nada)
    // busca o cadastro de alguém pelo e-mail, para permitir entrar num
    // novo aparelho sem reescrever nome/cargo/matrícula/repartição
    if (action === 'get_user') {
      var email = (data.email || '').trim().toLowerCase();
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[1]).toLowerCase() === email) {
          return respond({
            ok: true, found: true,
            nome: String(r[0]), cargo: String(r[2]), matricula: String(r[3]),
            reparticaoId: String(r[4]), reparticaoNome: String(r[5]),
            foto: r[9] ? String(r[9]) : '',
            telefone: r[10] ? String(r[10]) : ''
          });
        }
      }
      return respond({ ok: true, found: false });
    }

    // lista TODAS as repartições em que este e-mail está cadastrado
    // (pendente ou habilitado) — usado na aba "Conexões" do perfil
    if (action === 'list_user_reparticoes') {
      var email = (data.email || '').trim().toLowerCase();
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      var reparticoes = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[1]).toLowerCase() === email) {
          reparticoes.push({
            rowIndex: i + 1,
            reparticaoId: String(r[4]),
            reparticaoNome: String(r[5]),
            cargo: String(r[2]),
            matricula: String(r[3]),
            habilitado: !!r[6],
            habilitadoEm: r[7] ? formatDate_(r[7]) : ''
          });
        }
      }
      return respond({ ok: true, reparticoes: reparticoes });
    }

    // atualiza só a foto de um cadastro já existente (chamado ao trocar
    // a foto de perfil), sem mexer nos demais campos
    if (action === 'update_photo') {
      var email = (data.email || '').trim().toLowerCase();
      var reparticaoId = String(data.reparticaoId || '');
      var foto = data.foto || '';
      if (!email) return respond({ ok: true });
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email && String(rows[i][4]) === reparticaoId) {
          sheet.getRange(i + 1, 10).setValue(foto);
          break;
        }
      }
      return respond({ ok: true });
    }

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

    // ---------- histórico central de relatórios enviados ao Drive ----------
    if (action === 'log_report') {
      var sheet = getOrCreateReportsSheet();
      sheet.appendRow([
        (data.email || '').trim().toLowerCase(),
        data.nome || '',
        data.reparticaoId || '',
        data.relatorioNum || '',
        data.arquivo || '',
        data.driveLink || '',
        new Date()
      ]);
      return respond({ ok: true });
    }

    if (action === 'list_reports') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: true, relatorios: [] });
      var sheet = getOrCreateReportsSheet();
      var rows = sheet.getDataRange().getValues();
      var relatorios = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[0]).toLowerCase() !== email) continue;
        relatorios.push({
          relatorioNum: String(r[3]),
          arquivo: String(r[4]),
          driveLink: String(r[5]),
          dataEnvio: r[6] ? formatDate_(r[6]) : '',
          reparticaoId: String(r[2])
        });
      }
      relatorios.reverse(); // mais recentes primeiro
      return respond({ ok: true, relatorios: relatorios });
    }

    // ---------- repartições pendentes de cadastro ----------
    if (action === 'register_reparticao_pendente') {
      var sheet = getOrCreateReparticoesPendentesSheet();
      sheet.appendRow([
        data.nome || '',
        data.email || '',
        data.clientId || '',
        data.folderId || '',
        data.usuarioNome || '',
        data.usuarioCargo || '',
        data.usuarioMatricula || '',
        data.usuarioEmail || '',
        new Date(),
        'pendente'
      ]);
      return respond({ ok: true, rowIndex: sheet.getLastRow() });
    }

    if (action === 'list_reparticoes_pendentes') {
      var sheet = getOrCreateReparticoesPendentesSheet();
      var rows = sheet.getDataRange().getValues();
      var pendentes = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        pendentes.push({
          rowIndex: i + 1,
          nome: String(r[0]),
          email: String(r[1]),
          clientId: String(r[2]),
          folderId: String(r[3]),
          usuarioNome: String(r[4]),
          usuarioCargo: String(r[5]),
          usuarioMatricula: String(r[6]),
          usuarioEmail: String(r[7]),
          dataCadastro: r[8] ? formatDate_(r[8]) : '',
          status: r[9] ? String(r[9]) : 'pendente'
        });
      }
      pendentes.reverse();
      return respond({ ok: true, pendentes: pendentes });
    }

    // marca como confirmada (em vez de apagar) — assim outros aparelhos
    // continuam vendo que essa repartição já foi validada em algum lugar,
    // e podem só adicioná-la localmente, sem precisar reconfirmar
    if (action === 'confirm_reparticao_central') {
      var rowIndex = Number(data.rowIndex);
      if (!rowIndex || rowIndex < 2) {
        return respond({ ok: false, error: 'Registro inválido.' });
      }
      var sheet = getOrCreateReparticoesPendentesSheet();
      sheet.getRange(rowIndex, 10).setValue('confirmada');
      return respond({ ok: true });
    }

    if (action === 'remove_reparticao_pendente') {
      var rowIndex = Number(data.rowIndex);
      if (!rowIndex || rowIndex < 2) {
        return respond({ ok: false, error: 'Registro inválido.' });
      }
      var sheet = getOrCreateReparticoesPendentesSheet();
      sheet.deleteRow(rowIndex);
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
    sheet.appendRow(['Nome', 'Email', 'Cargo', 'Matricula', 'ReparticaoId', 'ReparticaoNome', 'Habilitado', 'HabilitadoEm', 'DataCadastro', 'FotoBase64', 'Telefone']);
    return sheet;
  }

  var sheet = ss.getSheetByName('Usuarios') || ss.getSheets()[0];
  // garante as colunas de foto/telefone mesmo em planilhas criadas antes desta atualização
  if (sheet.getRange(1, 10).getValue() !== 'FotoBase64') {
    sheet.getRange(1, 10).setValue('FotoBase64');
  }
  if (sheet.getRange(1, 11).getValue() !== 'Telefone') {
    sheet.getRange(1, 11).setValue('Telefone');
  }
  return sheet;
}

function getOrCreateReportsSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('USERS_SHEET_ID');
  var ss = null;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
  }
  if (!ss) {
    // garante que a planilha (com a aba de usuários) já exista antes
    getOrCreateUsersSheet();
    ss = SpreadsheetApp.openById(props.getProperty('USERS_SHEET_ID'));
  }

  var sheet = ss.getSheetByName('Relatorios');
  if (!sheet) {
    sheet = ss.insertSheet('Relatorios');
    sheet.appendRow(['Email', 'Nome', 'ReparticaoId', 'RelatorioNum', 'Arquivo', 'DriveLink', 'DataEnvio']);
  }
  return sheet;
}

function getOrCreateReparticoesPendentesSheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('USERS_SHEET_ID');
  var ss = null;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
  }
  if (!ss) {
    getOrCreateUsersSheet();
    ss = SpreadsheetApp.openById(props.getProperty('USERS_SHEET_ID'));
  }

  var sheet = ss.getSheetByName('ReparticoesPendentes');
  if (!sheet) {
    sheet = ss.insertSheet('ReparticoesPendentes');
    sheet.appendRow(['Nome', 'Email', 'ClientId', 'FolderId', 'UsuarioNome', 'UsuarioCargo', 'UsuarioMatricula', 'UsuarioEmail', 'DataCadastro', 'Status']);
    return sheet;
  }
  // garante a coluna de status mesmo em planilhas criadas antes desta atualização
  if (sheet.getRange(1, 10).getValue() !== 'Status') {
    sheet.getRange(1, 10).setValue('Status');
  }
  return sheet;
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
