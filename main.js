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
  /* Google Ads conversions ride on the same Google tag. Each event below that
     has a label also counts as a conversion in the Ads account. */
  var BEAR_ADS = 'AW-18478960913';
  var ADS_LABELS = {
    form_submit_business: 'aeg0CLGZjowdEJGiuutE', // Quote form submit
    account_submit: 'XwqECLSZjowdEJGiuutE',       // Contractor account request
    contact_click: 'FPH9CLeZjowdEJGiuutE'         // Phone or text tap (secondary)
  };
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
    window.gtag('config', BEAR_ADS);
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
    if (window.gtag && BEAR_GA4.indexOf('XXXX') < 0) {
      window.gtag('event', ev, p);
      if (ADS_LABELS[ev]) { window.gtag('event', 'conversion', { send_to: BEAR_ADS + '/' + ADS_LABELS[ev] }); }
    }
    if (window.clarity && BEAR_CLARITY.indexOf('XXXX') < 0) { try { window.clarity('event', ev); } catch (e) {} }
  }
  window.bearTrack = track;   // the bin finder reports through the same pipe
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="tel:"],a[href^="sms:"]');
    if (!a) return;
    var sec = a.closest('section,header,footer,.callbar,.req__out');
    track('contact_click', {
      method: a.getAttribute('href').indexOf('tel:') === 0 ? 'call' : 'text',
      placement: sec ? (sec.id || sec.className.split(' ')[0]) : 'page'
    });
  });

  /* ── phone and text links on a computer: tel: and sms: do nothing on most PCs, so a
     click shows the number with a copy button and a way to send the job online ── */
  var DESKTOP = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var pop = null;
  function fmtNum(href) {
    var d = href.replace(/\D/g, '').slice(-10);
    return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : href.replace(/^(tel|sms):/, '');
  }
  function closePop() { if (pop) { pop.hidden = true; } }
  function showPop(a) {
    var href = a.getAttribute('href'), isText = href.indexOf('sms:') === 0, num = fmtNum(href);
    var mainLine = href.replace(/\D/g, '').slice(-10) === TEL;
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'callpop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Call or text dispatch');
      document.body.appendChild(pop);
      pop.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('[data-pop]');
        if (!t) { return; }
        var what = t.getAttribute('data-pop');
        if (what === 'x' || what === 'quote') { closePop(); }
        if (what === 'copy') {
          var n = t.getAttribute('data-num');
          var ok = function () { t.textContent = 'Copied'; setTimeout(function () { t.textContent = 'Copy number'; }, 2400); };
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(n).then(ok, function () {}); }
          track('contact_copy', { number: n });
        }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); } });
      document.addEventListener('click', function (e) {
        if (!pop || pop.hidden || pop.contains(e.target)) { return; }
        if (e.target.closest && e.target.closest('a[href^="tel:"],a[href^="sms:"]')) { return; }
        closePop();
      });
    }
    var quoteHref = document.getElementById('binForm') ? '#request' : '/#request';
    pop.innerHTML = '<button type="button" class="callpop__x" data-pop="x" aria-label="Close">×</button>' +
      '<p class="callpop__k">' + (isText ? 'Text this number from your phone' : 'Call from your phone') + '</p>' +
      '<p class="callpop__n">' + num + '</p>' +
      '<div class="callpop__acts"><button type="button" class="btn btn--line" data-pop="copy" data-num="' + num + '">Copy number</button>' +
      (mainLine ? '<a class="btn btn--red" data-pop="quote" href="' + quoteHref + '">Send the job online</a>' : '') + '</div>' +
      '<p class="callpop__f">A person answers, not a phone tree.</p>';
    pop.hidden = false;
  }
  if (DESKTOP) {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="tel:"],a[href^="sms:"]');
      if (!a || (pop && pop.contains(a))) { return; }
      ev.preventDefault();
      showPop(a);
    });
  }

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
  var LEAD_CC = 'brad@bearbinsutah.com'; // Bear gets a copy of every quote and account request
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
        el.hidden = (el.getAttribute('data-gate-show').split(' ').indexOf(choice) < 0);
        if (!el.hidden) { el.classList.add('in'); }
      });
    });
    applyMode(choice);
    try { sessionStorage.setItem(GATE_KEY, choice); } catch (e) {}
    if (!silent) { track(choice === 'home' ? 'gate_home' : 'gate_business', {}); }
  }
  /* the quote form serves both: business mode asks for the company and how often,
     home mode drops those and swaps in home job types */
  var PROJECTS = {
    business: ['New build', 'Remodel or tenant improvement', 'Roofing tear off', 'Demolition', 'Landscaping or excavation',
      'Standing commercial rotation', 'Property turnover or cleanout', 'Other business job'],
    home: ['Garage or home cleanout', 'Remodel or renovation', 'Roofing', 'Yard or landscaping', 'Concrete, dirt or rock',
      'Construction or demo', 'Moving or estate cleanout', 'Something else']
  };
  var FINDER_JOB = {
    business: { junk: 'Property turnover or cleanout', remodel: 'Remodel or tenant improvement', yard: 'Landscaping or excavation',
      roof: 'Roofing tear off', heavy: 'Landscaping or excavation', build: 'New build' },
    home: { junk: 'Garage or home cleanout', remodel: 'Remodel or renovation', yard: 'Yard or landscaping',
      roof: 'Roofing', heavy: 'Concrete, dirt or rock', build: 'Construction or demo' }
  };
  function fillFinderJob() {
    var fm = document.getElementById('binForm');
    if (!fm) { return; }
    var mat = fm.getAttribute('data-finder-material'), mode = fm.getAttribute('data-mode'), sel = fm.elements['project'];
    if (!mat || !mode || !sel || sel.value) { return; }
    var job = FINDER_JOB[mode] && FINDER_JOB[mode][mat];
    if (job) { sel.value = job; }
  }
  function applyMode(choice) {
    var fm = document.getElementById('binForm');
    if (!fm || (choice !== 'business' && choice !== 'home')) { return; }
    if (fm.getAttribute('data-mode') !== choice) {
      fm.setAttribute('data-mode', choice);
      [].forEach.call(fm.querySelectorAll('[data-only]'), function (el) {
        var on = el.getAttribute('data-only') === choice;
        el.hidden = !on;
        [].forEach.call(el.querySelectorAll('[data-req]'), function (i) { i.required = on; });
      });
      var sel = fm.elements['project'];
      if (sel) {
        var keep = sel.value;
        sel.innerHTML = '<option value="">Choose one…</option>' + PROJECTS[choice].map(function (p) { return '<option>' + p + '</option>'; }).join('');
        if (PROJECTS[choice].indexOf(keep) >= 0) { sel.value = keep; }
      }
      var wl = fm.querySelector('label[for="f-where"]');
      if (wl && wl.firstChild && wl.firstChild.nodeType === 3) {
        wl.firstChild.nodeValue = choice === 'home' ? 'Address or city ' : 'Jobsite address or city ';
      }
    }
    fillFinderJob();
  }

  if (gates.length) {
    var remembered = null;
    try { remembered = sessionStorage.getItem(GATE_KEY); } catch (e) {}
    var preset = gates[0].getAttribute('data-gate-default');
    var asked = (location.search.match(/[?&]for=(home|business)(&|$)/) || [])[1];   // links like /?for=home#request
    if (asked) { setGate(asked, true); }
    else if (preset) { setGate(preset, true); }
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
      var mode = form.getAttribute('data-mode') === 'home' ? 'home' : 'business';

      var f = {
        company: val('company'), name: val('name'), phone: val('phone'), email: val('email'),
        project: val('project'), where: val('where'), size: form.elements['size'].value,
        date: val('date'), standing: val('standing'), notes: val('notes')
      };

      var missing = [];
      if (mode === 'business' && !f.company) { missing.push('your company'); }
      if (!f.name)    { missing.push('your name'); }
      if (!f.phone)   { missing.push('a phone number'); }
      if (!validEmail(f.email)) { missing.push('a working email'); }
      if (!f.project) { missing.push('the type of job'); }
      if (!f.where)   { missing.push('where the bin goes'); }
      if (!f.size)    { missing.push('a bin size'); }

      flag(form.elements['company'], mode === 'business' && !f.company);
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
      if (mode === 'home') { f.company = ''; f.standing = ''; }
      lines.push(mode === 'home' ? 'Customer: home project' : 'Company: ' + f.company);
      lines.push('Contact: ' + f.name + ', ' + f.phone + ', ' + f.email);
      lines.push('Job: ' + f.project + (f.standing ? ' (' + f.standing + ')' : ''));
      lines.push('Bin: ' + f.size);
      lines.push('Where: ' + f.where);
      if (f.date)  { lines.push('Start: ' + prettyDate(f.date)); }
      if (f.notes) { lines.push('Going in: ' + f.notes); }
      var summary = lines.join('\n');

      var fields = {
        // name, phone and jobsite up front so a text alert built from the subject is enough to call back
        // home requests say so up front so dispatch can tell them apart at a glance
        _subject: mode === 'home'
          ? 'Bear home quote request: ' + f.name + ' ' + f.phone + ', ' + f.size + ' at ' + f.where
          : 'Bear quote request: ' + f.company + ', ' + f.name + ' ' + f.phone + ', ' + f.size + ' at ' + f.where,
        _cc: LEAD_CC,
        _replyto: f.email,
        customer: mode,
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
        // only business requests count as the Google Ads conversion, so bidding never learns to chase homeowners
        track(mode === 'home' ? 'form_submit_home' : 'form_submit_business', { bin: f.size, job: f.project, standing: f.standing || '', text_ok: fields.text_ok, offer_ok: fields.offer_ok });
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
      form.elements[form.getAttribute('data-mode') === 'home' ? 'name' : 'company'].focus({ preventScroll: true });
    });
  }

  /* ── bin card buttons and the bin finder hand a size to the quote form ── */
  function applyFinderPick(d) {
    var fm = document.getElementById('binForm');
    if (!fm || !d) { return false; }
    var r = d.size && fm.querySelector('input[name="size"][value="' + d.size + '"]');
    if (r) { r.checked = true; }
    var notes = fm.elements['notes'];
    if (notes && d.note && notes.value.indexOf('Bin finder:') < 0) { notes.value = d.note + (notes.value ? '\n' + notes.value : ''); }
    if (d.material) { fm.setAttribute('data-finder-material', d.material); }
    fillFinderJob();
    var sec = document.getElementById('request');
    if (sec) { revealAt('#request'); sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    return true;
  }
  document.addEventListener('bear:finder-pick', function (e) { if (applyFinderPick(e.detail)) { e.preventDefault(); } });
  try {
    var savedPick = sessionStorage.getItem('bear.finder');
    if (savedPick && document.getElementById('binForm')) { sessionStorage.removeItem('bear.finder'); applyFinderPick(JSON.parse(savedPick)); }
  } catch (e) {}
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-pick-size]');
    if (!b) { return; }
    var fm = document.getElementById('binForm');
    var size = b.getAttribute('data-pick-size');
    if (fm) {
      var r = fm.querySelector('input[name="size"][value="' + size + '"]');
      if (r) { r.checked = true; }
    }
    track('size_pick', { bin: size });
  });

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
        fields._subject = 'Bear contractor account request: ' + (fields.business || '') + ', ' + (fields.contact || '') + ' ' + (fields.phone || '');
        fields._cc = LEAD_CC;
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
