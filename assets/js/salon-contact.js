/* Dedicated, tracker-free contact/withdrawal forms. No browser persistence. */
(() => {
  'use strict';
  const notice = document.getElementById('privacy-notice');
  function openNotice() {
    if (!notice) return;
    if (notice.tagName === 'DIALOG') notice.showModal();
    else notice.open = true;
  }
  document.getElementById('privacy-open')?.addEventListener('click', openNotice);
  document.getElementById('privacy-close')?.addEventListener('click', () => notice.close());
  if (notice && location.hash === '#privacy-notice') openNotice();

  document.querySelectorAll('#salon-form').forEach(initializeForm);
  function initializeForm(form) {
    const endpoint = form.action;
    const withdraw = form.dataset.mode === 'withdraw';
    const status = form.querySelector('.status');
    const phone = form.elements.phone;
    const email = form.elements.email;
    const sms = form.elements.consent_sms;
    const mail = form.elements.consent_email;
    const submit = form.querySelector('button[type="submit"]');
    const version = form.elements.consent_version?.value;
    const token = withdraw ? location.hash.slice(1) : '';
    let privateReady = false;
    let busy = false;
    const messages = {
      consent_required: 'Renseignez votre téléphone, votre e-mail, ou les deux pour vous inscrire.',
      channel_required: 'Choisissez les SMS, les e-mails, ou les deux.',
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
        field.setAttribute('aria-describedby', status.id);
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
      [phone, email, sms, mail].filter(Boolean).forEach(field => {
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
      });
      // Read current values at submission, including Safari fills without input events.
      // No request is made merely because a coordinate was typed or autofilled.
      const wantsSms = withdraw ? sms.checked : Boolean(phone.value.trim());
      const wantsEmail = withdraw ? mail.checked : Boolean(email.value.trim());
      if (!wantsSms && !wantsEmail) return show(messages[withdraw ? 'channel_required' : 'consent_required'], withdraw ? sms : phone);
      if (!privateReady && wantsSms && !phone.value.trim()) return show('Ajoutez le numéro de mobile concerné.', phone);
      if (!privateReady && wantsEmail && (!email.value.trim() || !email.validity.valid)) return show(messages.invalid_email, email);
      const payload = {
        action: withdraw ? 'withdraw' : 'subscribe',
        company_url: form.elements.company_url.value,
        phone: wantsSms ? phone.value.trim() : '',
        email: wantsEmail ? email.value.trim() : ''
      };
      if (withdraw) {
        payload.channels = [wantsSms && 'sms', wantsEmail && 'email'].filter(Boolean);
        if (privateReady) payload.token = token;
      } else Object.assign(payload, { consent_sms: wantsSms, consent_email: wantsEmail, consent_version: version });
      busy = true;
      submit.disabled = true;
      status.textContent = 'Un instant…';
      try {
        const data = await request(payload);
        form.reset();
        show(withdraw
          ? 'Votre demande est prise en compte. Vous ne recevrez plus nos communications sur les canaux choisis.'
          : `Merci ! Votre inscription par ${wantsSms && wantsEmail ? 'SMS et e-mail' : wantsSms ? 'SMS' : 'e-mail'} est enregistrée.`, null, true);
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
          if (url.origin === 'https://cognac-leopold-croizet.com' && url.pathname === '/se-retrouver/desinscription/') {
            const link = document.createElement('a');
            // On the local preview, keep the withdrawal flow on the same local service.
            link.href = location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? url.pathname + url.hash : url.href;
            link.className = 'success-link';
            link.textContent = 'Gérer mes inscriptions (lien à conserver)';
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
  }
})();
