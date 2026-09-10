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
        if (r[11]) continue; // excluído — não aparece mais nessa lista
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
      var foto = data.foto || '';
      if (!email) return respond({ ok: true });
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      // a foto é um dado pessoal, não específico de uma repartição —
      // atualiza em TODAS as linhas desse e-mail, não só na da
      // repartição em que o usuário estava conectado no momento
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email) {
          sheet.getRange(i + 1, 10).setValue(foto);
        }
      }
      return respond({ ok: true });
    }

    // atualiza nome/cargo/matrícula/telefone em TODAS as linhas desse
    // e-mail — usado ao editar "Dados pessoais" no perfil, sem
    // depender de nenhuma repartição específica e sem criar linha nova
    if (action === 'update_user_profile') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: true });
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email) {
          if (data.nome) sheet.getRange(i + 1, 1).setValue(data.nome);
          if (data.cargo) sheet.getRange(i + 1, 3).setValue(data.cargo);
          if (data.matricula) sheet.getRange(i + 1, 4).setValue(data.matricula);
          if (data.telefone) sheet.getRange(i + 1, 11).setValue(data.telefone);
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
        new Date(),
        data.reparticaoNome || '',
        data.processoNum || '',
        data.metadataText || ''
      ]);
      return respond({ ok: true });
    }

    if (action === 'list_reports') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: true, relatorios: [] });
      var sheet = getOrCreateReportsSheet();
      var rows = sheet.getDataRange().getValues();
      var arquivosIndex = buildArquivosEnviadosIndex_();
      var relatorios = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[0]).toLowerCase() !== email) continue;
        var relatorioNum = String(r[3]);
        var reparticaoId = String(r[2]);
        relatorios.push({
          relatorioNum: relatorioNum,
          arquivo: String(r[4]),
          driveLink: String(r[5]),
          dataEnvio: r[6] ? formatDate_(r[6]) : '',
          reparticaoId: reparticaoId,
          reparticaoNome: r[7] ? String(r[7]) : '',
          processoNum: r[8] ? String(r[8]) : '',
          arquivosEnviados: arquivosIndex[relatorioNum + '|' + reparticaoId] || []
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
        'pendente',
        data.folderNome || ''
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
          status: r[9] ? String(r[9]) : 'pendente',
          folderNome: r[10] ? String(r[10]) : ''
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

    // atualiza dados de uma repartição já registrada centralmente (ex.:
    // nome da pasta do Drive editado depois da criação) — encontra a
    // linha pelo Client ID, já que o rowIndex local pode não ser
    // conhecido/estar desatualizado no aparelho que está editando
    if (action === 'update_reparticao_central') {
      var clientId = data.clientId || '';
      if (!clientId) return respond({ ok: false, error: 'Client ID não informado.' });
      var sheet = getOrCreateReparticoesPendentesSheet();
      var rows = sheet.getDataRange().getValues();
      var atualizou = false;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][2]) === clientId) {
          if (data.nome) sheet.getRange(i + 1, 1).setValue(data.nome);
          if (data.folderId) sheet.getRange(i + 1, 4).setValue(data.folderId);
          if (data.folderNome !== undefined) sheet.getRange(i + 1, 11).setValue(data.folderNome);
          atualizou = true;
        }
      }
      return respond({ ok: true, atualizou: atualizou });
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

    // ---------- histórico de acessos ao app ----------
    if (action === 'log_access') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: true });
      var sheet = getOrCreateAcessosSheet();
      sheet.appendRow([email, new Date(), data.acao || '', data.detalhe || '']);
      return respond({ ok: true });
    }

    if (action === 'list_user_access') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: true, acessos: [] });
      var sheet = getOrCreateAcessosSheet();
      var rows = sheet.getDataRange().getValues();
      var acessos = [];
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() !== email) continue;
        var acao = rows[i][2] ? String(rows[i][2]) : '';
        if (!acao) continue; // só entram registros com um ato descrito
        var detalhe = rows[i][3] ? String(rows[i][3]) : '';
        var descricao = acao + (detalhe ? ' — ' + detalhe : '');
        acessos.push((rows[i][1] ? formatDate_(rows[i][1]) : '') + ': ' + descricao);
      }
      acessos.reverse();
      return respond({ ok: true, acessos: acessos.slice(0, 10) });
    }

    // ---------- lista agregada de TODOS os usuários (aba "Usuários cadastrados") ----------
    if (action === 'list_all_users') {
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      var porEmail = {};
      var ordem = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        var email = String(r[1]).toLowerCase();
        if (!email) continue;
        if (!porEmail[email]) {
          porEmail[email] = {
            nome: String(r[0]), email: email, foto: r[9] ? String(r[9]) : '',
            telefone: r[10] ? String(r[10]) : '',
            dataCadastro: r[8] ? formatDate_(r[8]) : '',
            excluidoGeral: false,
            reparticoes: []
          };
          ordem.push(email);
        }
        var u = porEmail[email];
        // mantém o nome/foto mais recentes (última linha encontrada para o e-mail)
        u.nome = String(r[0]);
        if (r[9]) u.foto = String(r[9]);
        var excluido = !!r[11];
        if (excluido) u.excluidoGeral = true;
        var status = excluido ? 'excluido' : (!!r[6] ? 'habilitado' : 'pendente');
        var desde = excluido ? (r[12] ? formatDate_(r[12]) : '') : (!!r[6] ? (r[7] ? formatDate_(r[7]) : '') : (r[8] ? formatDate_(r[8]) : ''));
        u.reparticoes.push({
          rowIndex: i + 1,
          reparticaoNome: String(r[5]), cargo: String(r[2]), matricula: String(r[3]),
          status: status, desde: desde
        });
      }
      var usuarios = ordem.map(function(email){ return porEmail[email]; });
      return respond({ ok: true, usuarios: usuarios });
    }

    // marca TODAS as linhas desse e-mail como excluídas (revoga o acesso
    // por completo, mas preserva o histórico — não apaga as linhas)
    if (action === 'disable_user_everywhere') {
      var email = (data.email || '').trim().toLowerCase();
      if (!email) return respond({ ok: false, error: 'E-mail não informado.' });
      var sheet = getOrCreateUsersSheet();
      var rows = sheet.getDataRange().getValues();
      var agora = new Date();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email) {
          sheet.getRange(i + 1, 12).setValue(true);
          sheet.getRange(i + 1, 13).setValue(agora);
        }
      }
      return respond({ ok: true });
    }

    // ---------- equipamentos (PCs) cadastrados por repartição ----------
    // vinculados ao Client ID da repartição — só aparecem para quem
    // estiver conectado à mesma repartição em que foram cadastrados
    if (action === 'register_equipamento') {
      var reparticaoId = data.reparticaoId || '';
      if (!reparticaoId) return respond({ ok: false, error: 'Repartição não informada.' });
      var sheet = getOrCreateEquipamentosSheet();
      sheet.appendRow([
        reparticaoId,
        data.nome || '',
        data.serie || '',
        data.uuid || '',
        data.so || '',
        data.tombamento || '',
        data.cadastradoPor || '',
        new Date()
      ]);
      return respond({ ok: true });
    }

    if (action === 'list_equipamentos') {
      var reparticaoId = data.reparticaoId || '';
      if (!reparticaoId) return respond({ ok: true, equipamentos: [] });
      var sheet = getOrCreateEquipamentosSheet();
      var rows = sheet.getDataRange().getValues();
      var equipamentos = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[0]) !== reparticaoId) continue;
        equipamentos.push({
          rowIndex: i + 1,
          nome: String(r[1]), serie: String(r[2]), uuid: String(r[3]), so: String(r[4]),
          tombamento: String(r[5]), cadastradoPor: String(r[6]), dataCadastro: r[7] ? formatDate_(r[7]) : ''
        });
      }
      return respond({ ok: true, equipamentos: equipamentos });
    }

    if (action === 'remove_equipamento') {
      var rowIndex = Number(data.rowIndex);
      if (!rowIndex || rowIndex < 2) {
        return respond({ ok: false, error: 'Registro inválido.' });
      }
      var sheet = getOrCreateEquipamentosSheet();
      sheet.deleteRow(rowIndex);
      return respond({ ok: true });
    }

    if (action === 'log_arquivo_enviado') {
      var sheet = getOrCreateArquivosEnviadosSheet();
      sheet.appendRow([
        (data.email || '').trim().toLowerCase(),
        data.reparticaoId || '',
        data.arquivo || '',
        data.driveLink || '',
        new Date(),
        data.relatorioNum || '',
        data.processoNum || ''
      ]);
      return respond({ ok: true });
    }

    // ---------- estatísticas gerais do app (aba "Informações Gerais") ----------
    if (action === 'get_app_stats') {
      var usersSheet = getOrCreateUsersSheet();
      var userRows = usersSheet.getDataRange().getValues();
      var emailsUnicos = {};
      for (var i = 1; i < userRows.length; i++) {
        var email = String(userRows[i][1]).toLowerCase();
        if (email && !userRows[i][11]) emailsUnicos[email] = true; // ignora excluídos
      }
      var usuariosCount = Object.keys(emailsUnicos).length;

      var pendSheet = getOrCreateReparticoesPendentesSheet();
      var pendRows = pendSheet.getDataRange().getValues();
      var reparticoesConhecidas = {};
      for (var i = 1; i < pendRows.length; i++) {
        if (String(pendRows[i][9]) === 'confirmada') {
          reparticoesConhecidas[String(pendRows[i][2])] = true; // ClientId
        }
      }
      // a repartição padrão original do app (Servidor EFS Technology)
      // nunca passou pelo cadastro central de repartições — só conta
      // com base nesse cadastro sub-contaria; cruza também com o
      // ReparticaoId de quem já está registrado como usuário, que
      // sempre existe mesmo para essa repartição original
      for (var i = 1; i < userRows.length; i++) {
        var repId = String(userRows[i][4]);
        if (repId) reparticoesConhecidas[repId] = true;
      }
      var reparticoesCount = Object.keys(reparticoesConhecidas).length;

      var equipSheet = getOrCreateEquipamentosSheet();
      var equipamentosCount = Math.max(0, equipSheet.getDataRange().getValues().length - 1);

      var reportsSheet = getOrCreateReportsSheet();
      var relatoriosCount = Math.max(0, reportsSheet.getDataRange().getValues().length - 1);

      var arquivosSheet = getOrCreateArquivosEnviadosSheet();
      var arquivosCount = Math.max(0, arquivosSheet.getDataRange().getValues().length - 1);

      return respond({
        ok: true,
        usuariosCount: usuariosCount,
        reparticoesCount: reparticoesCount,
        equipamentosCount: equipamentosCount,
        relatoriosCount: relatoriosCount,
        arquivosCount: arquivosCount
      });
    }

    // ---------- contadores de pendências (badges de notificação) ----------
    if (action === 'get_pending_counts') {
      var pendSheet = getOrCreateReparticoesPendentesSheet();
      var pendRows = pendSheet.getDataRange().getValues();
      var reparticoesPendentesSet = {};
      for (var i = 1; i < pendRows.length; i++) {
        if (String(pendRows[i][9]) !== 'confirmada') {
          reparticoesPendentesSet[String(pendRows[i][2])] = true; // ClientId
        }
      }
      var reparticoesPendentesCount = Object.keys(reparticoesPendentesSet).length;

      var usersSheet = getOrCreateUsersSheet();
      var userRows = usersSheet.getDataRange().getValues();
      var usuariosPendentesCount = 0;
      for (var i = 1; i < userRows.length; i++) {
        if (!userRows[i][6] && !userRows[i][11]) usuariosPendentesCount++; // Habilitado=false, não excluído
      }

      return respond({
        ok: true,
        reparticoesPendentesCount: reparticoesPendentesCount,
        usuariosPendentesCount: usuariosPendentesCount
      });
    }

    // ---------- lista completa de relatórios (Gestão do App > busca) ----------
    if (action === 'list_all_reports') {
      var sheet = getOrCreateReportsSheet();
      var rows = sheet.getDataRange().getValues();
      var arquivosIndex = buildArquivosEnviadosIndex_();
      var relatorios = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        var relatorioNum = String(r[3]);
        var reparticaoId = String(r[2]);
        relatorios.push({
          email: String(r[0]),
          nome: String(r[1]),
          reparticaoId: reparticaoId,
          relatorioNum: relatorioNum,
          arquivo: String(r[4]),
          driveLink: String(r[5]),
          dataEnvio: r[6] ? formatDate_(r[6]) : '',
          reparticaoNome: r[7] ? String(r[7]) : '',
          processoNum: r[8] ? String(r[8]) : '',
          arquivosEnviados: arquivosIndex[relatorioNum + '|' + reparticaoId] || []
        });
      }
      relatorios.reverse();
      return respond({ ok: true, relatorios: relatorios });
    }

    // ---------- análise de metadados do relatório por IA ----------
    // nunca acessa o conteúdo extraído do dispositivo (mensagens,
    // fotos) — só os campos de documentação do próprio relatório
    if (action === 'analyze_report_metadata') {
      var relatorioNum = data.relatorioNum || '';
      var reparticaoId = data.reparticaoId || '';
      if (!relatorioNum) return respond({ ok: false, error: 'Número do relatório não informado.' });

      // 1) já existe uma análise em cache para este relatório?
      var cacheSheet = getOrCreateAnaliseIASheet();
      var cacheRows = cacheSheet.getDataRange().getValues();
      for (var i = 1; i < cacheRows.length; i++) {
        if (String(cacheRows[i][0]) === relatorioNum && String(cacheRows[i][1]) === reparticaoId) {
          return respond({ ok: true, analise: String(cacheRows[i][2]), dataAnalise: formatDate_(cacheRows[i][3]), cache: true });
        }
      }

      // 2) busca o texto de metadados salvo com o relatório
      var reportsSheet = getOrCreateReportsSheet();
      var reportRows = reportsSheet.getDataRange().getValues();
      var metadataText = '';
      for (var i = 1; i < reportRows.length; i++) {
        if (String(reportRows[i][3]) === relatorioNum && String(reportRows[i][2]) === reparticaoId) {
          metadataText = String(reportRows[i][9] || '');
          break;
        }
      }
      if (!metadataText) {
        return respond({ ok: false, error: 'Não foram encontrados metadados salvos para este relatório (relatórios enviados antes desta funcionalidade não têm esse dado).' });
      }

      // 3) chama o provedor de IA institucional configurado
      var prompt = 'Você está analisando os METADADOS de um relatório técnico de extração forense de arquivo digital (não o conteúdo extraído em si — só a documentação do procedimento). ' +
        'Com base SOMENTE nos dados abaixo, responda em português, em até 6 linhas, cobrindo: ' +
        '(1) um resumo objetivo do procedimento documentado; ' +
        '(2) se algum campo essencial parece incompleto ou inconsistente; ' +
        '(3) se o procedimento aparenta estar de acordo com boas práticas de cadeia de custódia. ' +
        'Não emita julgamento sobre crimes, indícios ou conteúdo — isso é atribuição exclusiva da autoridade responsável, não sua.\n\n' +
        'DADOS DO RELATÓRIO:\n' + metadataText;

      var analise;
      try {
        analise = callAIProvider_([{ role: 'user', content: prompt }], 500) || 'Sem resposta da IA.';
      } catch (aiErr) {
        return respond({ ok: false, error: aiErr.message });
      }

      // 4) guarda em cache, para não reanalisar (e não gastar de novo) o mesmo relatório
      cacheSheet.appendRow([relatorioNum, reparticaoId, analise, new Date(), (data.email || '').trim().toLowerCase()]);

      return respond({ ok: true, analise: analise, dataAnalise: formatDate_(new Date()), cache: false });
    }

    // ---------- chat livre com a IA institucional (editor de Minuta IA) ----------
    // ao contrário da análise de metadados, aqui o usuário pode digitar
    // qualquer coisa — por isso só faz sentido com a IA institucional,
    // contratada pela repartição, nunca com uma chave pessoal
    if (action === 'ai_chat') {
      var mensagens = data.messages || [];
      if (!mensagens.length) return respond({ ok: false, error: 'Nenhuma mensagem enviada.' });
      try {
        var resposta = callAIProvider_(mensagens, 1500) || 'Sem resposta da IA.';
        return respond({ ok: true, resposta: resposta });
      } catch (aiErr) {
        return respond({ ok: false, error: aiErr.message });
      }
    }

    // ---------- configuração do provedor de IA institucional (admin) ----------
    if (action === 'get_ai_config') {
      var props = PropertiesService.getScriptProperties();
      return respond({
        ok: true,
        provider: props.getProperty('AI_PROVIDER') || '',
        temChave: !!props.getProperty('AI_API_KEY')
      });
    }
    if (action === 'set_ai_config') {
      var props = PropertiesService.getScriptProperties();
      if (data.provider) props.setProperty('AI_PROVIDER', String(data.provider).toLowerCase());
      if (data.apiKey) props.setProperty('AI_API_KEY', String(data.apiKey));
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
    sheet.appendRow(['Nome', 'Email', 'Cargo', 'Matricula', 'ReparticaoId', 'ReparticaoNome', 'Habilitado', 'HabilitadoEm', 'DataCadastro', 'FotoBase64', 'Telefone', 'Excluido', 'ExcluidoEm']);
    return sheet;
  }

  var sheet = ss.getSheetByName('Usuarios') || ss.getSheets()[0];
  // garante as colunas mesmo em planilhas criadas antes desta atualização
  if (sheet.getRange(1, 10).getValue() !== 'FotoBase64') {
    sheet.getRange(1, 10).setValue('FotoBase64');
  }
  if (sheet.getRange(1, 11).getValue() !== 'Telefone') {
    sheet.getRange(1, 11).setValue('Telefone');
  }
  if (sheet.getRange(1, 12).getValue() !== 'Excluido') {
    sheet.getRange(1, 12).setValue('Excluido');
  }
  if (sheet.getRange(1, 13).getValue() !== 'ExcluidoEm') {
    sheet.getRange(1, 13).setValue('ExcluidoEm');
  }
  return sheet;
}

function getOrCreateAcessosSheet() {
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
  var sheet = ss.getSheetByName('Acessos');
  if (!sheet) {
    sheet = ss.insertSheet('Acessos');
    sheet.appendRow(['Email', 'DataHora', 'Acao', 'Detalhe']);
    return sheet;
  }
  if (sheet.getRange(1, 3).getValue() !== 'Acao') {
    sheet.getRange(1, 3).setValue('Acao');
  }
  if (sheet.getRange(1, 4).getValue() !== 'Detalhe') {
    sheet.getRange(1, 4).setValue('Detalhe');
  }
  return sheet;
}

function getOrCreateEquipamentosSheet() {
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
  var sheet = ss.getSheetByName('Equipamentos');
  if (!sheet) {
    sheet = ss.insertSheet('Equipamentos');
    sheet.appendRow(['ReparticaoId', 'Nome', 'Serie', 'Uuid', 'SistemaOperacional', 'Tombamento', 'CadastradoPor', 'DataCadastro']);
  }
  return sheet;
}

// agrupa a planilha "ArquivosEnviados" por relatório (chave
// "RelatorioNum|ReparticaoId"), para anexar a cada relatório os
// links de todos os arquivos evidência enviados junto com ele —
// lida a planilha inteira uma única vez, não uma vez por relatório
function buildArquivosEnviadosIndex_(){
  var sheet = getOrCreateArquivosEnviadosSheet();
  var rows = sheet.getDataRange().getValues();
  var index = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var relatorioNum = r[5] ? String(r[5]) : '';
    var reparticaoId = r[1] ? String(r[1]) : '';
    if (!relatorioNum) continue; // arquivos antigos, enviados antes desta correção, ficam sem vínculo
    var chave = relatorioNum + '|' + reparticaoId;
    if (!index[chave]) index[chave] = [];
    index[chave].push({
      arquivo: String(r[2]),
      driveLink: String(r[3]),
      dataEnvio: r[4] ? formatDate_(r[4]) : ''
    });
  }
  return index;
}

function getOrCreateArquivosEnviadosSheet() {
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
  var sheet = ss.getSheetByName('ArquivosEnviados');
  if (!sheet) {
    sheet = ss.insertSheet('ArquivosEnviados');
    sheet.appendRow(['Email', 'ReparticaoId', 'Arquivo', 'DriveLink', 'DataEnvio', 'RelatorioNum', 'ProcessoNum']);
    return sheet;
  }
  if (sheet.getRange(1, 6).getValue() !== 'RelatorioNum') {
    sheet.getRange(1, 6).setValue('RelatorioNum');
  }
  if (sheet.getRange(1, 7).getValue() !== 'ProcessoNum') {
    sheet.getRange(1, 7).setValue('ProcessoNum');
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
    sheet.appendRow(['Email', 'Nome', 'ReparticaoId', 'RelatorioNum', 'Arquivo', 'DriveLink', 'DataEnvio', 'ReparticaoNome', 'ProcessoNum', 'MetadataText']);
    return sheet;
  }
  if (sheet.getRange(1, 8).getValue() !== 'ReparticaoNome') {
    sheet.getRange(1, 8).setValue('ReparticaoNome');
  }
  if (sheet.getRange(1, 9).getValue() !== 'ProcessoNum') {
    sheet.getRange(1, 9).setValue('ProcessoNum');
  }
  if (sheet.getRange(1, 10).getValue() !== 'MetadataText') {
    sheet.getRange(1, 10).setValue('MetadataText');
  }
  return sheet;
}

// ---------- camada de abstração multi-provedor de IA ----------
// o administrador escolhe, na Gestão do App, qual provedor a
// instituição contratou (Propriedade "AI_PROVIDER": anthropic |
// gemini | openai | deepseek), e cadastra a chave correspondente
// (Propriedade "AI_API_KEY") — nunca fica exposta ao navegador
function callAIProvider_(messages, maxTokens){
  var props = PropertiesService.getScriptProperties();
  var provider = (props.getProperty('AI_PROVIDER') || 'anthropic').toLowerCase();
  var apiKey = props.getProperty('AI_API_KEY');
  if (!apiKey) {
    throw new Error('Nenhuma chave de IA configurada no servidor (Propriedade "AI_API_KEY"). Peça ao administrador para configurar em Gestão do App > Informações Gerais.');
  }

  if (provider === 'anthropic') {
    var payload = { model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: messages };
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('Erro na API da Anthropic (HTTP ' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 300));
    var data = JSON.parse(res.getContentText());
    return (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : '';
  }

  if (provider === 'gemini') {
    var contents = messages.map(function(m){
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
    });
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    var res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ contents: contents, generationConfig: { maxOutputTokens: maxTokens } }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('Erro na API do Gemini (HTTP ' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 300));
    var data = JSON.parse(res.getContentText());
    var cand = data.candidates && data.candidates[0];
    return (cand && cand.content && cand.content.parts && cand.content.parts[0]) ? cand.content.parts[0].text : '';
  }

  if (provider === 'openai') {
    var res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify({ model: 'gpt-4o', max_tokens: maxTokens, messages: messages }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('Erro na API da OpenAI (HTTP ' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 300));
    var data = JSON.parse(res.getContentText());
    return (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : '';
  }

  if (provider === 'deepseek') {
    var res = UrlFetchApp.fetch('https://api.deepseek.com/chat/completions', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify({ model: 'deepseek-chat', max_tokens: maxTokens, messages: messages }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error('Erro na API da DeepSeek (HTTP ' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 300));
    var data = JSON.parse(res.getContentText());
    return (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : '';
  }

  throw new Error('Provedor de IA desconhecido: ' + provider);
}

function getOrCreateAnaliseIASheet() {
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
  var sheet = ss.getSheetByName('AnaliseIA');
  if (!sheet) {
    sheet = ss.insertSheet('AnaliseIA');
    sheet.appendRow(['RelatorioNum', 'ReparticaoId', 'Analise', 'DataAnalise', 'SolicitadoPor']);
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
    sheet.appendRow(['Nome', 'Email', 'ClientId', 'FolderId', 'UsuarioNome', 'UsuarioCargo', 'UsuarioMatricula', 'UsuarioEmail', 'DataCadastro', 'Status', 'FolderNome']);
    return sheet;
  }
  // garante as colunas mesmo em planilhas criadas antes desta atualização
  if (sheet.getRange(1, 10).getValue() !== 'Status') {
    sheet.getRange(1, 10).setValue('Status');
  }
  if (sheet.getRange(1, 11).getValue() !== 'FolderNome') {
    sheet.getRange(1, 11).setValue('FolderNome');
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
