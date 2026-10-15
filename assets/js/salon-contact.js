/* Dedicated, tracker-free contact/withdrawal forms. No browser persistence. */
(() => {
  'use strict';
  const form = document.getElementById('salon-form');
  if (!form) return;
  const endpoint = form.action;
  const withdraw = form.dataset.mode === 'withdraw';
  const status = document.getElementById('form-status');
  const phone = form.elements.phone;
  const email = form.elements.email;
  const sms = form.elements.consent_sms;
  const mail = form.elements.consent_email;
  const submit = form.querySelector('button[type="submit"]');
  const version = form.elements.consent_version?.value;
  const token = withdraw ? location.hash.slice(1) : '';
  const notice = document.getElementById('privacy-notice');
  let privateReady = false;
  let busy = false;
  const messages = {
    consent_required: 'Choisissez les SMS, les e-mails, ou les deux : c’est vous qui décidez.',
    channel_required: 'Choisissez les SMS, les e-mails, ou les deux.',
    adult_required: 'Merci de confirmer que vous êtes majeur(e).',
    invalid_sms: 'Vérifiez votre mobile : 06 ou 07 en France, ou le préfixe international (+…).',
    invalid_email: 'Vérifiez votre adresse e-mail, s’il vous plaît.',
    rate_limited: 'Beaucoup de demandes ont été reçues. Réessayez dans quinze minutes.',
    consent_version_changed: 'La page a été mise à jour. Rechargez-la avant de vous inscrire.',
    invalid_token: 'Ce lien privé n’est pas valide. Utilisez le formulaire avec votre coordonnée, ou écrivez-nous.',
    expired_challenge: 'Votre session a expiré. Réessayez, s’il vous plaît.',
    challenge_reused: 'Cette demande a déjà été traitée. Vous pouvez réessayer.',
    temporarily_unavailable: 'Le service est momentanément indisponible. Réessayez un peu plus tard ou écrivez à cognac@mdpierre.com.'
  };
  function show(message, field, success = false) {
    status.textContent = message;
    status.classList.toggle('success', success);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'form-status');
      field.focus();
    } else status.focus();
  }
  async function request(payload) {
    const init = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const challenge = await init.json();
    if (!init.ok || !challenge.ok) throw new Error(challenge.status || 'temporarily_unavailable');
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...payload, challenge: challenge.challenge })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.status || 'temporarily_unavailable');
    return data;
  }
  document.getElementById('privacy-open')?.addEventListener('click', () => { notice.open = true; });
  if (notice && location.hash === '#privacy-notice') notice.open = true;
  submit.disabled = false;
  if (withdraw && token) {
    submit.disabled = true;
    document.getElementById('management-state').textContent = 'Un instant, nous retrouvons vos choix…';
    request({ action: 'inspect', token }).then(data => {
      privateReady = true;
      document.getElementById('contact-fields').hidden = true;
      const active = data.channels.filter(item => item.state === 'active').map(item => item.channel);
      for (const [channel, field] of [['sms', sms], ['email', mail]]) {
        field.disabled = !active.includes(channel);
        field.closest('.consent').hidden = field.disabled;
      }
      document.getElementById('management-state').textContent = active.length
        ? 'Votre lien privé a été reconnu. Cochez les communications à arrêter.'
        : 'Aucune inscription active n’est associée à ce lien. Votre choix est bien pris en compte.';
      submit.disabled = active.length === 0;
      if (!active.length) form.hidden = true;
    }).catch(error => {
      document.getElementById('management-state').textContent = messages[error.message] || messages.temporarily_unavailable;
      // Keep the public opposition form available if the private link is invalid.
      submit.disabled = false;
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    status.textContent = '';
    [phone, email, sms, mail, form.elements.adult].filter(Boolean).forEach(field => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
    if (!sms.checked && !mail.checked) return show(messages[withdraw ? 'channel_required' : 'consent_required'], sms);
    if (!privateReady && sms.checked && !phone.value.trim()) return show('Ajoutez le numéro de mobile concerné.', phone);
    if (!privateReady && mail.checked && (!email.value.trim() || !email.validity.valid)) return show(messages.invalid_email, email);
    if (!withdraw && !form.elements.adult.checked) return show(messages.adult_required, form.elements.adult);
    const payload = {
      action: withdraw ? 'withdraw' : 'subscribe',
      company_url: form.elements.company_url.value,
      phone: sms.checked ? phone.value.trim() : '',
      email: mail.checked ? email.value.trim() : ''
    };
    if (withdraw) {
      payload.channels = [sms.checked && 'sms', mail.checked && 'email'].filter(Boolean);
      if (privateReady) payload.token = token;
    } else Object.assign(payload, { consent_sms: sms.checked, consent_email: mail.checked, adult: true, consent_version: version });
    busy = true;
    submit.disabled = true;
    status.textContent = 'Un instant…';
    try {
      const data = await request(payload);
      form.reset();
      show(withdraw
        ? 'Votre demande est prise en compte. Vous ne recevrez plus nos communications sur les canaux choisis.'
        : 'Merci ! Vos choix sont bien enregistrés. Au plaisir de vous donner de nos nouvelles.', null, true);
      if (withdraw) {
        if (privateReady) {
          const current = await request({ action: 'inspect', token });
          const active = current.channels.filter(item => item.state === 'active').map(item => item.channel);
          for (const [channel, field] of [['sms', sms], ['email', mail]]) {
            field.disabled = !active.includes(channel);
            field.closest('.consent').hidden = field.disabled;
          }
          submit.hidden = active.length === 0;
          document.getElementById('management-state').textContent = active.length
            ? 'Vous pouvez aussi gérer le canal encore actif ci-dessous.' : 'Aucune inscription active n’est associée à ce lien.';
        } else submit.hidden = true;
      } else if (typeof data.manage_url === 'string') {
        const url = new URL(data.manage_url);
        if (url.origin === 'https://cognac-leopold-croizet.com' && url.pathname === '/salon/desinscription/') {
          const link = document.createElement('a');
          // On the local preview, keep the withdrawal flow on the same local service.
          link.href = location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? url.pathname + url.hash : url.href;
          link.className = 'success-link';
          link.textContent = 'Mon lien privé pour gérer mes choix (à conserver)';
          link.rel = 'noreferrer';
          status.append(link);
        }
      }
    } catch (error) {
      const field = error.message === 'invalid_sms' ? phone : error.message === 'invalid_email' ? email : null;
      show(messages[error.message] || messages.temporarily_unavailable, field);
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
})();
