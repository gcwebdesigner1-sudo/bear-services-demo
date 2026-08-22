/* Bear Services — demo interactions (zero dependencies) */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

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
    // collapsed via max-height:0, which leaves the links focusable — hide them
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

  /* ── request-a-bin: composes the text message, sends nothing ──
     No backend on GitHub Pages, and their whole pitch is "one text does it
     all" — so the form writes the SMS and hands it to the customer's own app.
     Desktop browsers largely ignore sms: links, hence the copy fallback. ── */
  var form = document.getElementById('binForm');
  if (form) {
    var out    = document.getElementById('binOut');
    var msgBox = document.getElementById('binMsg');
    var sendA  = document.getElementById('binSend');
    var copyB  = document.getElementById('binCopy');
    var backB  = document.getElementById('binBack');
    var errBox = document.getElementById('formErr');
    var TEL    = '8017854494';

    function val(n) {
      var el = form.elements[n];
      return el && el.value ? el.value.trim() : '';
    }
    function prettyDate(iso) {
      if (!iso) return '';
      var p = iso.split('-');
      if (p.length !== 3) return iso;
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('en-US',
        { weekday: 'long', month: 'long', day: 'numeric' });
    }
    function flag(el, bad) {
      if (!el) return;
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name  = val('name'),
          phone = val('phone'),
          where = val('where'),
          size  = form.elements['size'].value,
          job   = val('job'),
          date  = val('date'),
          notes = val('notes');

      var missing = [];
      if (!name)  { missing.push('your name'); }
      if (!phone) { missing.push('a phone number'); }
      if (!size)  { missing.push('a bin size'); }
      if (!where) { missing.push('where it goes'); }

      flag(form.elements['name'],  !name);
      flag(form.elements['phone'], !phone);
      flag(form.elements['where'], !where);
      document.querySelector('.field--set')
        .setAttribute('aria-invalid', size ? 'false' : 'true');

      if (missing.length) {
        errBox.textContent = 'Still need ' + missing.join(', ') + '.';
        errBox.hidden = false;
        var firstBad = form.querySelector('[aria-invalid="true"]');
        var focusMe = firstBad && (firstBad.focus ? firstBad : firstBad.querySelector('input'));
        if (focusMe && focusMe.focus) { focusMe.focus(); }
        return;
      }
      errBox.hidden = true;

      var lines = [];
      lines.push('Hi Bear Services — I\'d like to get a bin.');
      lines.push('');
      lines.push('Name: ' + name);
      lines.push('Phone: ' + phone);
      lines.push('Bin: ' + size);
      lines.push('Where: ' + where);
      if (date)  { lines.push('Drop-off: ' + prettyDate(date)); }
      if (job)   { lines.push('Job: ' + job); }
      if (notes) { lines.push('Throwing away: ' + notes); }
      var msg = lines.join('\n');

      msgBox.textContent = msg;
      // "?&body=" is the form both iOS and Android accept
      sendA.href = 'sms:' + TEL + '?&body=' + encodeURIComponent(msg);

      form.hidden = true;
      out.hidden = false;
      out.classList.add('in');
      out.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sendA.focus({ preventScroll: true });
    });

    copyB.addEventListener('click', function () {
      var done = function () {
        copyB.textContent = 'Copied — paste it into a text to (801) 785-4494';
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
      form.elements['name'].focus({ preventScroll: true });
    });
  }

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
