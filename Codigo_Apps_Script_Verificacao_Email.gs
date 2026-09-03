/**
 * Custódia Digital — Verificação de e-mail por código
 *
 * Como publicar (passo a passo completo no LEIA-ME.md):
 * 1. Acesse script.google.com → Novo projeto.
 * 2. Apague o conteúdo padrão e cole todo este arquivo.
 * 3. Salve o projeto (ex.: nome "Verificacao Custodia Digital").
 * 4. Implantar → Nova implantação → tipo "App da Web".
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Autorize as permissões pedidas (envio de e-mail em seu nome).
 * 6. Copie a URL gerada (termina em /exec) e cole no app, em
 *    "⚙️ Configurar verificação de e-mail" (tela de login).
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var email = (data.email || '').trim().toLowerCase();

    if (!email) {
      return respond({ ok: false, error: 'E-mail não informado.' });
    }

    var cache = CacheService.getScriptCache();

    if (action === 'send') {
      // limite simples: não reenviar antes de 60 segundos, para reduzir abuso
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

    return respond({ ok: false, error: 'Ação inválida.' });

  } catch (err) {
    return respond({ ok: false, error: 'Erro no servidor: ' + err.message });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
