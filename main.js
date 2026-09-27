/* Bear Services site interactions (zero dependencies) */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  /* ── analytics: events for Google Tag Manager (window.dataLayer) ──
     contact_click  {method:'call'|'text', placement, page_path}
     gate_business / gate_home      who the bin is for
     form_start                     first focus on the quote form
     form_error {missing}           submit blocked, which fields were empty
     form_abandon {last_field, filled}   started, never sent, visitor left
     form_submit_business {bin, job, standing, text_ok, offer_ok}
     form_fallback_sms / form_open_sms / form_copy   the text message fallback
     optin_submit / account_submit ── */
  window.dataLayer = window.dataLayer || [];

  /* ── analytics loaders: set the two ids and both tools turn on. Loaders stay
     off while an id still contains XXXX. GA4 records every track() event
     below; Clarity records sessions, heatmaps, rage clicks and drop off. ── */
  var BEAR_GA4 = 'G-W0F5XXEYBS';
  var BEAR_CLARITY = 'yp1cffadyp';
  // only the real site reports, so local previews and test runs stay out of the numbers
  var LIVE_HOST = /(^|\.)bearbinsutah\.com$/.test(location.hostname);
  if (LIVE_HOST && BEAR_GA4.indexOf('XXXX') < 0) {
    var gs = document.createElement('script');
    gs.async = true;
    gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + BEAR_GA4;
    document.head.appendChild(gs);
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', BEAR_GA4);
  }
  if (LIVE_HOST && BEAR_CLARITY.indexOf('XXXX') < 0) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    var cs = document.createElement('script');
    cs.async = true;
    cs.src = 'https://www.clarity.ms/tag/' + BEAR_CLARITY;
    document.head.appendChild(cs);
  }

  function track(ev, data) {
    var o = { event: ev, page_path: location.pathname };
    var p = { page_path: location.pathname };
    for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) { o[k] = data[k]; p[k] = data[k]; } }
    window.dataLayer.push(o);
    if (!LIVE_HOST) return;
    if (window.gtag && BEAR_GA4.indexOf('XXXX') < 0) { window.gtag('event', ev, p); }
    if (window.clarity && BEAR_CLARITY.indexOf('XXXX') < 0) { try { window.clarity('event', ev); } catch (e) {} }
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="tel:"],a[href^="sms:"]');
    if (!a) return;
    var sec = a.closest('section,header,footer,.callbar,.req__out');
    track('contact_click', {
      method: a.getAttribute('href').indexOf('tel:') === 0 ? 'call' : 'text',
      placement: sec ? (sec.id || sec.className.split(' ')[0]) : 'page'
    });
  });

  /* ── scroll reveals ── */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        // stagger siblings so grids cascade instead of popping at once
        var sibs = el.parentElement ? [].slice.call(el.parentElement.children) : [];
        var i = sibs.indexOf(el);
        el.style.transitionDelay = (i > 0 ? Math.min(i, 5) * 90 : 0) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* Anchor jumps must never land on a still-hidden section. */
  function revealAt(hash) {
    var target = hash && document.querySelector(hash);
    if (!target) return;
    target.classList.add('in');
    target.querySelectorAll('.reveal').forEach(function (el) {
      el.style.transitionDelay = '0ms';
      el.classList.add('in');
    });
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length > 1) revealAt(hash);
    closeNav();
  });
  window.addEventListener('hashchange', function () { revealAt(location.hash); });
  if (location.hash) revealAt(location.hash);

  /* ── sticky header shadow ── */
  var hdr = document.getElementById('hdr');
  var onScroll = function () {
    hdr.classList.toggle('stuck', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── mobile nav ── */
  var burger = document.getElementById('burger');
  var mobnav = document.getElementById('mobnav');
  function setNav(open) {
    mobnav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    // collapsed via max-height:0, which leaves the links focusable, so hide them
    // from the tab order too, or a keyboard user tabs into an invisible menu
    mobnav.setAttribute('aria-hidden', open ? 'false' : 'true');
    [].forEach.call(mobnav.children, function (a) {
      if (open) { a.removeAttribute('tabindex'); } else { a.setAttribute('tabindex', '-1'); }
    });
  }
  function closeNav() { setNav(false); }
  setNav(false);
  burger.addEventListener('click', function () {
    setNav(!mobnav.classList.contains('open'));
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ── lead capture ──────────────────────────────────────────────────────
     Every form posts JSON to LEAD_ENDPOINT (FormSubmit AJAX) so the request
     lands in an inbox. Swap the hash for the Bear mailbox once that address is
     activated. If the post fails (offline, endpoint down), the quote form falls
     back to composing a text message the customer sends from their own phone.
     Events: gate_business, gate_home, form_submit_business, form_fallback_sms,
             optin_submit, account_submit ─────────────────────────────────── */
  var LEAD_ENDPOINT = 'https://formsubmit.co/ajax/6d11c64cf1c7f0f056ca805e64691e44';
  var TEL = '8017854494';
  var OFFER_AMOUNT = '$50';
  var OFFER_CODE = 'BEAR50';

  function postLead(fields) {
    if (!window.fetch || !LEAD_ENDPOINT) { return Promise.reject(new Error('no endpoint')); }
    fields._captcha = 'false';
    fields._template = 'table';
    fields.page = location.pathname;
    return fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    }).then(function (r) {
      if (!r.ok) { throw new Error('http ' + r.status); }
      return r.json();
    }).then(function (j) {
      if (j && (j.success === 'true' || j.success === true)) { return j; }
      throw new Error('rejected');
    });
  }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function flag(el, bad) { if (el) { el.setAttribute('aria-invalid', bad ? 'true' : 'false'); } }

  /* ── the gate: business or home ── */
  var GATE_KEY = 'bear.gate';
  var gates = [].slice.call(document.querySelectorAll('[data-gate]'));
  function setGate(choice, silent) {
    gates.forEach(function (g) {
      [].forEach.call(g.querySelectorAll('.gate__o input'), function (r) { r.checked = (r.value === choice); });
      [].forEach.call(g.querySelectorAll('[data-gate-show]'), function (el) {
        el.hidden = (el.getAttribute('data-gate-show') !== choice);
        if (!el.hidden) { el.classList.add('in'); }
      });
    });
    try { sessionStorage.setItem(GATE_KEY, choice); } catch (e) {}
    if (!silent) { track(choice === 'home' ? 'gate_home' : 'gate_business', {}); }
  }
  if (gates.length) {
    var remembered = null;
    try { remembered = sessionStorage.getItem(GATE_KEY); } catch (e) {}
    var preset = gates[0].getAttribute('data-gate-default');
    if (preset) { setGate(preset, true); }
    else if (remembered === 'business' || remembered === 'home') { setGate(remembered, true); }
    else {
      gates.forEach(function (g) {
        [].forEach.call(g.querySelectorAll('[data-gate-show]'), function (el) { el.hidden = true; });
      });
    }
    document.addEventListener('change', function (ev) {
      var r = ev.target;
      if (r && r.matches && r.matches('.gate__o input') && r.checked) { setGate(r.value, false); }
    });
  }

  /* ── quote request ── */
  var form = document.getElementById('binForm');
  if (form) {
    var out    = document.getElementById('binOut');
    var outHd  = document.getElementById('binOutHd');
    var msgBox = document.getElementById('binMsg');
    var sendA  = document.getElementById('binSend');
    var copyB  = document.getElementById('binCopy');
    var backB  = document.getElementById('binBack');
    var errBox = document.getElementById('formErr');
    var submitB = document.getElementById('binSubmit');
    var lastSize = '';

    function val(n) {
      var el = form.elements[n];
      return el && el.value ? el.value.trim() : '';
    }
    function checked(n) {
      var el = form.elements[n];
      return !!(el && el.checked);
    }
    function prettyDate(iso) {
      if (!iso) return '';
      var p = iso.split('-');
      if (p.length !== 3) return iso;
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    function showOut(mode, heading, text) {
      outHd.textContent = heading;
      msgBox.textContent = text;
      sendA.hidden = (mode !== 'sms');
      copyB.hidden = (mode !== 'sms');
      form.hidden = true;
      out.hidden = false;
      out.classList.add('in');
      out.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    var started = false, finished = false, leftSent = false, lastField = '';
    form.addEventListener('focusin', function (e) {
      if (e.target && e.target.name) { lastField = e.target.name; }
      if (started) return;
      started = true;
      track('form_start', {});
    });

    // drop off: the form was started, never sent, and the visitor is leaving
    function filledCount() {
      var n = 0;
      ['company', 'name', 'phone', 'email', 'project', 'where', 'size', 'date', 'standing', 'notes'].forEach(function (k) {
        var el = form.elements[k];
        if (el && el.value && String(el.value).trim()) { n++; }
      });
      return n;
    }
    function leaving() {
      if (!started || finished || leftSent) return;
      leftSent = true;
      track('form_abandon', { last_field: lastField, filled: filledCount() });
    }
    window.addEventListener('pagehide', leaving);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { leaving(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var f = {
        company: val('company'), name: val('name'), phone: val('phone'), email: val('email'),
        project: val('project'), where: val('where'), size: form.elements['size'].value,
        date: val('date'), standing: val('standing'), notes: val('notes')
      };

      var missing = [];
      if (!f.company) { missing.push('your company'); }
      if (!f.name)    { missing.push('your name'); }
      if (!f.phone)   { missing.push('a phone number'); }
      if (!validEmail(f.email)) { missing.push('a working email'); }
      if (!f.project) { missing.push('the type of job'); }
      if (!f.where)   { missing.push('where the bin goes'); }
      if (!f.size)    { missing.push('a bin size'); }

      flag(form.elements['company'], !f.company);
      flag(form.elements['name'],    !f.name);
      flag(form.elements['phone'],   !f.phone);
      flag(form.elements['email'],   !validEmail(f.email));
      flag(form.elements['project'], !f.project);
      flag(form.elements['where'],   !f.where);
      document.querySelector('.field--set').setAttribute('aria-invalid', f.size ? 'false' : 'true');

      if (missing.length) {
        track('form_error', { missing: missing.join('|') });
        errBox.textContent = 'Still need ' + missing.join(', ') + '.';
        errBox.hidden = false;
        var firstBad = form.querySelector('[aria-invalid="true"]');
        var focusMe = firstBad && (firstBad.focus ? firstBad : firstBad.querySelector('input'));
        if (focusMe && focusMe.focus) { focusMe.focus(); }
        return;
      }
      errBox.hidden = true;
      lastSize = f.size;

      var lines = [];
      lines.push('Company: ' + f.company);
      lines.push('Contact: ' + f.name + ', ' + f.phone + ', ' + f.email);
      lines.push('Job: ' + f.project + (f.standing ? ' (' + f.standing + ')' : ''));
      lines.push('Bin: ' + f.size);
      lines.push('Where: ' + f.where);
      if (f.date)  { lines.push('Start: ' + prettyDate(f.date)); }
      if (f.notes) { lines.push('Going in: ' + f.notes); }
      var summary = lines.join('\n');

      var fields = {
        _subject: 'Bear quote request: ' + f.company,
        _replyto: f.email,
        company: f.company, name: f.name, phone: f.phone, email: f.email, project: f.project,
        where: f.where, size: f.size, start: f.date, standing: f.standing, notes: f.notes,
        text_ok: checked('text_ok') ? 'yes' : 'no',
        offer_ok: checked('offer_ok') ? 'yes' : 'no',
        consent_wording: 'v1 2026-09-24 quote form',
        consent_at: new Date().toISOString()
      };
      if (checked('offer_ok')) {
        fields._autoresponse = 'Thanks, dispatch has your request and will text or call you with the price. Your ' +
          OFFER_AMOUNT + ' off code for the first bin is ' + OFFER_CODE + '. Mention it when dispatch reaches you. ' +
          'Bear Services, 581 W 1600 N, Orem, Utah. Reply stop to end these emails.';
      }

      submitB.disabled = true;
      submitB.textContent = 'Sending…';
      postLead(fields).then(function () {
        finished = true;
        track('form_submit_business', { bin: f.size, job: f.project, standing: f.standing || '', text_ok: fields.text_ok, offer_ok: fields.offer_ok });
        showOut('sent', 'Got it. Dispatch has your request.',
          'Dispatch will text or call ' + f.phone + ' with the price for ' + f.where + ', usually within the hour during the day.\n\n' + summary);
      }).catch(function () {
        finished = true;
        track('form_fallback_sms', { bin: f.size, job: f.project });
        var msg = "Hi Bear Services, I'd like a quote on a bin.\n\n" + summary;
        sendA.href = 'sms:' + TEL + '?&body=' + encodeURIComponent(msg);
        msgBox.textContent = msg;
        showOut('sms', 'Your message is ready to send', msg);
      }).then(function () {
        submitB.disabled = false;
        submitB.innerHTML = '<svg class="ic"><use href="#i-arr"/></svg> Get my quote';
      });
    });

    sendA.addEventListener('click', function () { track('form_open_sms', { bin: lastSize }); });

    copyB.addEventListener('click', function () {
      track('form_copy', { bin: lastSize });
      var done = function () {
        copyB.textContent = 'Copied. Paste it into a text to (801) 785-4494';
        setTimeout(function () { copyB.textContent = 'Copy the message'; }, 3200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msgBox.textContent).then(done, fallbackCopy);
      } else {
        fallbackCopy();
      }
      function fallbackCopy() {
        var r = document.createRange();
        r.selectNodeContents(msgBox);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        try { document.execCommand('copy'); done(); } catch (err) {
          copyB.textContent = 'Select the text above to copy it';
        }
      }
    });

    backB.addEventListener('click', function () {
      out.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.elements['company'].focus({ preventScroll: true });
    });
  }

  /* ── offer opt in + contractor account (small forms, same endpoint) ── */
  [].forEach.call(document.querySelectorAll('form[data-lead]'), function (f) {
    var kind = f.getAttribute('data-lead');
    var okEl = f.querySelector('[data-ok]') || (f.parentElement && f.parentElement.querySelector('[data-ok]'));
    var errEl = f.querySelector('[data-err]') || (f.parentElement && f.parentElement.querySelector('[data-err]'));
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = {};
      [].forEach.call(f.elements, function (el) {
        if (!el.name || el.disabled) return;
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        fields[el.name] = (el.value || '').trim();
      });
      var emailEl = f.querySelector('[name="email"]');
      if (!validEmail(fields.email || '')) {
        flag(emailEl, true);
        if (errEl) { errEl.textContent = 'That email does not look right.'; errEl.hidden = false; }
        if (emailEl) { emailEl.focus(); }
        return;
      }
      flag(emailEl, false);
      if (kind === 'account' && !fields.business) {
        flag(f.querySelector('[name="business"]'), true);
        if (errEl) { errEl.textContent = 'Still need the business name.'; errEl.hidden = false; }
        return;
      }
      if (errEl) { errEl.hidden = true; }
      fields._replyto = fields.email;
      if (kind === 'optin') {
        fields._subject = 'Bear ' + OFFER_AMOUNT + ' off opt in';
        fields.consent_wording = 'v1 2026-09-24 offer box';
        fields._autoresponse = 'Your ' + OFFER_AMOUNT + ' off code for the first bin is ' + OFFER_CODE +
          '. Mention it when you text or call dispatch at (801) 785-4494 with the address and what is going in the bin. ' +
          'Bear Services, 581 W 1600 N, Orem, Utah. Reply stop to end these emails.';
      } else {
        fields._subject = 'Bear contractor account request: ' + (fields.business || '');
      }
      fields.consent_at = new Date().toISOString();
      var btn = f.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      postLead(fields).then(function () {
        track(kind === 'optin' ? 'optin_submit' : 'account_submit', {});
        f.hidden = true;
        if (okEl) { okEl.hidden = false; }
      }).catch(function () {
        if (errEl) { errEl.textContent = "Couldn't send. Text (801) 785-4494 and we'll take it from there."; errEl.hidden = false; }
      }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    });
  });

  /* ── FAQ: one open at a time, and deep links open the right one ── */
  var faqs = [].slice.call(document.querySelectorAll('.faq .fq'));
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d) { o.open = false; } });
    });
  });

  /* ── footer year ── */
  document.getElementById('yr').textContent = new Date().getFullYear();
})();
