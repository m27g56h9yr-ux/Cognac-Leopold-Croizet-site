(function () {
    'use strict';

    var messages = {
        fr: {
            sending: 'Envoi en cours...',
            done: 'Merci, votre adresse a bien été enregistrée.',
            duplicate: 'Cette adresse est déjà inscrite.',
            invalid: 'Merci de renseigner une adresse e-mail valide.',
            unavailable: 'Le service est momentanément indisponible. Vous pouvez nous écrire à cognac@mdpierrre.com.',
            buttonDone: 'Terminé'
        },
        en: {
            sending: 'Sending...',
            done: 'Thank you, your email address has been saved.',
            duplicate: 'This address is already registered.',
            invalid: 'Please enter a valid email address.',
            unavailable: 'The service is temporarily unavailable. You can email us at cognac@mdpierrre.com.',
            buttonDone: 'Done'
        },
        ru: {
            sending: 'Отправка...',
            done: 'Спасибо, ваш e-mail сохранен.',
            duplicate: 'Этот e-mail уже зарегистрирован.',
            invalid: 'Пожалуйста, укажите корректный e-mail.',
            unavailable: 'Сервис временно недоступен. Вы можете написать нам на cognac@mdpierrre.com.',
            buttonDone: 'Готово'
        },
        da: {
            sending: 'Sender...',
            done: 'Tak, din e-mailadresse er gemt.',
            duplicate: 'Denne e-mailadresse er allerede registreret.',
            invalid: 'Indtast venligst en gyldig e-mailadresse.',
            unavailable: 'Tjenesten er midlertidigt utilgængelig. Du kan skrive til cognac@mdpierrre.com.',
            buttonDone: 'Færdig'
        },
        sv: {
            sending: 'Skickar...',
            done: 'Tack, din e-postadress har sparats.',
            duplicate: 'Den här e-postadressen är redan registrerad.',
            invalid: 'Ange en giltig e-postadress.',
            unavailable: 'Tjänsten är tillfälligt otillgänglig. Du kan skriva till cognac@mdpierrre.com.',
            buttonDone: 'Klart'
        },
        no: {
            sending: 'Sender...',
            done: 'Takk, e-postadressen din er lagret.',
            duplicate: 'Denne e-postadressen er allerede registrert.',
            invalid: 'Skriv inn en gyldig e-postadresse.',
            unavailable: 'Tjenesten er midlertidig utilgjengelig. Du kan skrive til cognac@mdpierrre.com.',
            buttonDone: 'Ferdig'
        },
        zh: {
            sending: '正在发送...',
            done: '谢谢，您的电子邮箱已保存。',
            duplicate: '该电子邮箱已经登记。',
            invalid: '请输入有效的电子邮箱。',
            unavailable: '服务暂时不可用。您可以发送邮件至 cognac@mdpierrre.com。',
            buttonDone: '完成'
        }
    };

    function currentLanguage() {
        var lang = (document.documentElement.getAttribute('lang') || 'fr').toLowerCase();
        if (lang.indexOf('zh') === 0) return 'zh';
        return messages[lang.slice(0, 2)] ? lang.slice(0, 2) : 'en';
    }

    function endpointFor(form) {
        if (form.dataset.endpoint) return form.dataset.endpoint;
        if (window.LC_NEWSLETTER_ENDPOINT) return window.LC_NEWSLETTER_ENDPOINT;
        var base = '';
        if (window.location.pathname === '/Cognac-Leopold-Croizet-site' || window.location.pathname.indexOf('/Cognac-Leopold-Croizet-site/') === 0) {
            base = '/Cognac-Leopold-Croizet-site';
        }
        return base + '/api/newsletter.php';
    }

    function showMessage(form, type, text) {
        var box = form.querySelector('.info-systeme');
        if (!box) return;
        box.className = 'info-systeme ' + type;
        box.textContent = text;
    }

    function submitNewsletter(form) {
        var lang = currentLanguage();
        var copy = messages[lang] || messages.en;
        var input = form.querySelector('input[name="newsletter"]');
        var button = form.querySelector('button[type="submit"]');
        var email = input ? input.value.trim() : '';

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage(form, 'erreur', copy.invalid);
            return;
        }

        var data = new FormData(form);
        data.set('email', email);
        data.set('newsletter', email);
        data.set('language', lang);
        data.set('page', window.location.pathname);
        data.set('consent_version', 'newsletter-monthly-news-2026-06-10');

        if (button) {
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            button.dataset.originalText = button.textContent;
            button.innerHTML = "<i class='fas fa-spinner fa-spin'></i>";
        }
        showMessage(form, 'chargement', copy.sending);

        fetch(endpointFor(form), {
            method: 'POST',
            body: data,
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        }).then(function (response) {
            return response.text().then(function (text) {
                var payload = {};
                try {
                    payload = text ? JSON.parse(text) : {};
                } catch (error) {
                    payload = {};
                }
                if (!response.ok || payload.ok === false) {
                    throw payload;
                }
                return payload;
            });
        }).then(function (payload) {
            var status = payload.status === 'duplicate' ? 'duplicate' : 'done';
            showMessage(form, status === 'duplicate' ? 'notice' : 'succes', copy[status]);
            if (button) button.textContent = copy.buttonDone;
        }).catch(function (error) {
            var key = error && error.status === 'invalid' ? 'invalid' : 'unavailable';
            showMessage(form, 'erreur', copy[key]);
            if (button) button.textContent = button.dataset.originalText || copy.buttonDone;
        }).finally(function () {
            if (button) {
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        });
    }

    document.addEventListener('submit', function (event) {
        if (!event.target || !event.target.matches('.container-newsletter')) return;
        event.preventDefault();
        submitNewsletter(event.target);
    });
}());
