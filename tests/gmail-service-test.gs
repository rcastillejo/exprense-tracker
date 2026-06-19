/**
 * gmail-service-test.gs — Tests para GmailService con mock de GmailApp
 */

/**
 * Crea un mock de GmailMessage.
 */
function makeMockMessage(opts) {
  return {
    getId: () => opts.id || 'msg-001',
    getSubject: () => opts.subject || 'Test email',
    getPlainBody: () => opts.plainBody || '',
    getBody: () => opts.htmlBody || '',
    getThread: () => ({
      addLabel: (label) => { opts._labelAdded = label; }
    })
  };
}

/**
 * Crea un mock de GmailThread con un mensaje.
 */
function makeMockThread(message) {
  return {
    getMessages: () => [message]
  };
}

TestRunner.suite('GmailService — buildQuery', ({ test, assert }) => {
  const bankConfig = {
    banco_nombre: 'BCP',
    gmail_query: 'from:(alertas@notificacionesbcp.com.pe) subject:(consumo)',
    label_procesado: 'ingesta/bcp/ok',
    label_error: 'ingesta/bcp/error'
  };

  test('incluye la query base del banco', () => {
    const query = GmailService.buildQuery(bankConfig);
    assert.isTrue(query.includes('from:(alertas@notificacionesbcp.com.pe)'));
  });

  test('excluye emails con label ok', () => {
    const query = GmailService.buildQuery(bankConfig);
    assert.isTrue(query.includes('-label:ingesta/bcp/ok'));
  });

  test('excluye emails con label error', () => {
    const query = GmailService.buildQuery(bankConfig);
    assert.isTrue(query.includes('-label:ingesta/bcp/error'));
  });
});

TestRunner.suite('GmailService — getEmailBody', ({ test, assert }) => {
  test('retorna cuerpo plain text cuando está disponible', () => {
    const msg = makeMockMessage({ plainBody: 'Texto plano del email' });
    const body = GmailService.getEmailBody(msg);
    assert.equal(body, 'Texto plano del email');
  });

  test('convierte HTML cuando no hay plain text', () => {
    const msg = makeMockMessage({
      plainBody: '',
      htmlBody: '<p>Monto: <b>S/ 89.50</b></p>'
    });
    const body = GmailService.getEmailBody(msg);
    assert.isTrue(body.includes('S/'));
    assert.isTrue(body.includes('89.50'));
  });

  test('retorna string vacío si ambos cuerpos están vacíos', () => {
    const msg = makeMockMessage({ plainBody: '', htmlBody: '' });
    const body = GmailService.getEmailBody(msg);
    assert.equal(body, '');
  });
});

TestRunner.suite('GmailService — searchEmails', ({ test, assert }) => {
  test('retorna arreglo vacío cuando Gmail no encuentra emails', () => {
    const origSearch = GmailApp.search;
    GmailApp.search = () => [];

    const bankConfig = {
      banco_nombre: 'BCP',
      gmail_query: 'from:(test@test.com)',
      label_procesado: 'ingesta/bcp/ok',
      label_error: 'ingesta/bcp/error'
    };

    const emails = GmailService.searchEmails(bankConfig);
    assert.equal(emails.length, 0);

    GmailApp.search = origSearch;
  });

  test('retorna el primer mensaje de cada thread', () => {
    const msg1 = makeMockMessage({ id: 'msg-001' });
    const msg2 = makeMockMessage({ id: 'msg-002' });
    const thread1 = makeMockThread(msg1);
    const thread2 = makeMockThread(msg2);

    const origSearch = GmailApp.search;
    GmailApp.search = () => [thread1, thread2];

    const bankConfig = {
      banco_nombre: 'BCP',
      gmail_query: 'from:(test@test.com)',
      label_procesado: 'ingesta/bcp/ok',
      label_error: 'ingesta/bcp/error'
    };

    const emails = GmailService.searchEmails(bankConfig);
    assert.equal(emails.length, 2);
    assert.equal(emails[0].getId(), 'msg-001');
    assert.equal(emails[1].getId(), 'msg-002');

    GmailApp.search = origSearch;
  });
});

TestRunner.suite('GmailService — applyLabel', ({ test, assert }) => {
  test('aplica label al thread del mensaje', () => {
    const msgOpts = { id: 'msg-001' };
    const msg = makeMockMessage(msgOpts);

    const origGetLabel = GmailApp.getUserLabelByName;
    const origCreateLabel = GmailApp.createLabel;
    const mockLabel = { name: 'ingesta/bcp/ok' };

    GmailApp.getUserLabelByName = () => mockLabel;
    GmailApp.createLabel = (name) => ({ name });

    GmailService.applyLabel(msg, 'ingesta/bcp/ok');
    assert.deepEqual(msgOpts._labelAdded, mockLabel);

    GmailApp.getUserLabelByName = origGetLabel;
    GmailApp.createLabel = origCreateLabel;
  });
});
