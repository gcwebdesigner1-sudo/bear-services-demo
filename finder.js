/* Bin finder: three taps (what, how big, where it sits), then "I think a 15 yard fits" with the
   bin and the reasons, and a button that carries the pick into the quote form. No prices: dispatch
   quotes every job. Each answer re-themes the little scene at the top: trees grow for yard waste,
   boxes drop for a cleanout, blocks thud for concrete, and a red bin rolls in at the end.
   Opens from any [data-finder-open] button, or #find-my-bin. The dialog is built on first open,
   so pages pay nothing until someone asks for it. Every sizing statement comes from the site's own
   FAQ and bin specs; if the site does not say it, the finder does not say it. */
(function () {
  'use strict';

  var BINS = {
    15: { dims: '12 ft × 7½ ft × 5½ ft', len: 12, lbs: 12000, w: 878, h: 615 },
    30: { dims: '22 ft × 7½ ft × 6 ft', len: 22, lbs: 24000, w: 880, h: 604 }
  };

  var MATERIALS = [
    { id: 'junk',    label: 'Household junk',          sub: 'Furniture, boxes, a cleanout',  noun: 'cleanout' },
    { id: 'remodel', label: 'Remodel debris',          sub: 'Drywall, cabinets, flooring',   noun: 'remodel' },
    { id: 'yard',    label: 'Trees and yard waste',    sub: 'Branches, brush, sod',          noun: 'yard cleanup' },
    { id: 'roof',    label: 'Roofing',                 sub: 'Shingles and tear off',         noun: 'roofing job', heavy: true },
    { id: 'heavy',   label: 'Concrete, dirt or brick', sub: 'The heavy stuff',               noun: 'heavy load', heavy: true },
    { id: 'build',   label: 'Construction or demo',    sub: 'Framing scrap, jobsite debris', noun: 'build' }
  ];

  /* "How big is the job?" reads differently for a yard than for a roof. [small, medium, large] */
  var SCOPES = {
    junk:    [['A garage or a couple of rooms', 'A weekend of clearing out'], ['Most of a house', 'Several rooms plus the garage'], ['A whole house or an estate', 'Everything goes']],
    remodel: [['One room', 'A bathroom or a kitchen'], ['A few rooms or a whole floor', 'Walls, flooring, cabinets'], ['A whole house gut', 'Down to the studs']],
    yard:    [['A few trees or a cleanup', 'Branches, brush, trimmings'], ['A full yard overhaul', 'Trees, shrubs and sod'], ['A big lot or acreage', 'Clearing a lot of ground']],
    roof:    [['A shed, garage or small roof', 'A small tear off'], ['One house roof', 'A full tear off'], ['A big roof or several layers', 'A lot of shingles']],
    heavy:   [['A small patio or walkway', 'A few wheelbarrows'], ['A driveway or a big slab', 'A serious pile'], ['More than that', 'A big dig or a big pour']],
    build:   [['A small build or an addition', 'Framing scrap and offcuts'], ['A full house build or big demo', 'Steady debris'], ['An ongoing jobsite', 'Bins swapped as the crew fills them']]
  };
  var SCOPE_IDS = ['small', 'medium', 'large'];

  var PLACES = [
    { id: 'driveway', label: 'A driveway',            sub: 'The easy answer' },
    { id: 'street',   label: 'On the street',         sub: 'Or a public right of way' },
    { id: 'site',     label: 'A jobsite or open lot', sub: 'Plenty of room' }
  ];

  var PLACE_NOTE = {
    driveway: 'No permit needed in a driveway. The truck needs a straight run of roughly 60 feet to set the bin down.',
    street: 'Check with your city first. Orem and most Utah County cities want a permit before a container goes on the road.',
    site: "Tell us where you'd like it and we'll put it where the truck can reach it."
  };
  var FIT_15 = {
    junk: 'The 15 yard is the everyday bin. It handles most cleanouts.',
    remodel: 'The 15 yard is the everyday bin. It handles most remodels.',
    yard: 'The 15 yard handles most landscaping loads: branches, brush and sod.',
    build: 'The 15 yard handles small builds and additions.',
    roof: 'Shingles are dense, so plan around weight, not space. The 15 yard carries up to 12,000 lbs.',
    heavy: 'Concrete, dirt and brick are dense, so plan around weight, not space. The 15 yard carries up to 12,000 lbs.'
  };

  function material(id) { return MATERIALS.filter(function (m) { return m.id === id; })[0] || null; }
  function lbs(n) { return n.toLocaleString('en-US'); }
  function binLine(size) {
    var b = BINS[size];
    return 'It measures ' + b.dims.replace(/ × /g, ' by ') + ' on the outside and carries up to ' + lbs(b.lbs) + ' lbs.';
  }
  var BILLING = 'The first ton is included, and you get 14 days on site before a daily fee starts. After that you pay the scale weight of what was in the bin.';

  /** answers = { material, scope, place } → what to suggest and why. */
  function recommendBin(answers) {
    var m = material(answers && answers.material);
    var scope = answers && answers.scope;
    if (!m || SCOPE_IDS.indexOf(scope) < 0) { return null; }

    var size = scope === 'large' ? 30 : 15;
    if (m.id === 'build' && scope === 'medium') { size = 30; }   // the 30 is for full construction jobs and big demos

    var reasons = [];
    if (size === 15) {
      reasons.push(FIT_15[m.id]);
    } else {
      reasons.push(m.id === 'build'
        ? 'The 30 yard is the one for full construction jobs and big demos.'
        : "That's a big job. The 30 yard is double the capacity of the 15.");
    }
    reasons.push(binLine(size));
    reasons.push(BILLING);

    var notes = [];
    if (m.heavy) {
      notes.push('Heavy material hits the road limit long before the bin looks full. Fill it part way, and say what it is in the notes.');
    }
    if (answers.place && PLACE_NOTE[answers.place]) {
      notes.push(PLACE_NOTE[answers.place]);
      if (answers.place === 'driveway') { notes.push('Measure your driveway first: this bin is ' + BINS[size].len + ' ft long.'); }
    }
    /* jobs where one bin is not the whole answer: say so instead of pretending */
    var talkFirst = (m.id === 'heavy' && scope !== 'small') || (m.id === 'build' && scope === 'large');
    if (talkFirst) {
      notes.unshift(m.id === 'build'
        ? 'Standing rotations are set up with dispatch. Put how fast the crew fills a bin in the notes and they will plan the swaps.'
        : 'For this much heavy material, dispatch plans the loads with you when they call back. Put the rough amount in the notes.');
    }
    return { size: size, heavy: !!m.heavy, headline: 'I think a ' + size + ' yard fits your ' + m.noun + '.', reasons: reasons, notes: notes };
  }

  /* line icons in the same 24px stroke style as the site's sprite */
  var ICON = {
    junk:    '<path d="M3.5 8L12 3.5 20.5 8v8.5L12 21l-8.5-4.5z"/><path d="M3.5 8L12 12.5 20.5 8M12 12.5V21"/>',
    remodel: '<path d="M14 5l5 5-3 3-5-5z"/><path d="M11 8L3 16l3 3 8-8"/><path d="M13 3l6 6"/>',
    yard:    '<path d="M12 21v-5"/><path d="M12 3l4.5 6.5H14l4 6H6l4-6H7.5z"/>',
    roof:    '<path d="M2.5 12.5L12 4.5l9.5 8"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9 14h2.5M12.5 14H15M10.5 17h3"/>',
    heavy:   '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19"/>',
    build:   '<path d="M4 16a8 8 0 0116 0"/><path d="M2.5 16h19v2.5h-19z"/><path d="M10 8.3V5h4v3.3"/>',
    driveway:'<path d="M4 11l8-6.5 8 6.5v9a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M9.5 21v-6h5v6"/>',
    street:  '<path d="M7 21L9.5 3M17 21L14.5 3"/><path d="M12 5v2.5M12 10.5V13M12 16v2.5"/>',
    site:    '<path d="M3 21h18M5 21V6l7-3 7 3v15"/><path d="M9 10h2M13 10h2M9 14h2M13 14h2M9 18h6"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    s1: '<circle cx="12" cy="12" r="3.5"/>', s2: '<circle cx="12" cy="12" r="6"/>', s3: '<circle cx="12" cy="12" r="8.5"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'bf__ic') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function track(ev, data) { if (window.bearTrack) { window.bearTrack(ev, data || {}); } }

  /* ── scenes: a handful of positioned shapes per theme; how many depends on how big the job is ── */
  var COUNT = { small: 0, medium: 1, large: 2 };
  var LAYOUT = {
    yard:    { n: [3, 5, 8], items: [[22, 78], [40, 92], [10, 60], [54, 70], [31, 54], [47, 50], [4, 44], [61, 58]] },
    junk:    { n: [3, 6, 9], items: [[0, 0, 36], [40, 0, 42], [86, 0, 32], [44, 42, 30], [122, 0, 38], [3, 36, 28], [164, 0, 30], [126, 38, 28], [48, 72, 22]] },
    remodel: { n: [3, 5, 7], items: [[0, 0, 150, -1], [12, 10, 130, 2], [-4, 20, 160, -1], [20, 30, 110, 2], [6, 40, 140, -2], [26, 50, 96, 1], [10, 60, 120, -1]] },
    roof:    { n: [1, 2, 3], items: [] },
    heavy:   { n: [3, 5, 8], items: [[0, 0], [46, 0], [92, 0], [23, 25], [69, 25], [138, 0], [115, 25], [46, 50]] },
    build:   { n: [2, 3, 4], items: [[8, 30, 120], [30, 52, 140], [14, 74, 100], [40, 22, 90]] }
  };
  function scene(theme, scope, binSize) {
    var L = LAYOUT[theme], out = '';
    if (!L) { return ''; }
    var n = L.n[COUNT[scope] == null ? 1 : COUNT[scope]];
    if (theme === 'yard') {
      out += '<i class="sc-hill"></i>';
      L.items.slice(0, n).forEach(function (t, i) {
        out += '<svg class="sc-tree" style="left:' + t[0] + '%;height:' + t[1] + 'px;--d:' + (i * 90) + 'ms" viewBox="0 0 40 60" preserveAspectRatio="xMidYMax meet">' +
          '<rect x="17.5" y="46" width="5" height="14" rx="1.5"/><path d="M20 2l11 17h-6l9 14h-7l9 14H4l9-14H6l9-14H9z"/></svg>';
      });
      for (var l = 0; l < 7; l++) { out += '<i class="sc-leaf" style="left:' + (6 + l * 13) + '%;--d:' + (l * 420) + 'ms;--r:' + (l % 2 ? 1 : -1) + '"></i>'; }
    } else if (theme === 'junk') {
      L.items.slice(0, n).forEach(function (b, i) {
        out += '<i class="sc-box" style="left:calc(7% + ' + b[0] + 'px);bottom:' + (10 + b[1]) + 'px;width:' + b[2] + 'px;height:' + b[2] + 'px;--d:' + (i * 110) + 'ms;--r:' + ((i % 3) - 1) * 2 + 'deg"></i>';
      });
    } else if (theme === 'remodel') {
      L.items.slice(0, n).forEach(function (p, i) {
        out += '<i class="sc-plank" style="left:calc(6% + ' + p[0] + 'px);bottom:' + (10 + p[1]) + 'px;width:' + p[2] + 'px;--d:' + (i * 100) + 'ms;--r:' + p[3] + 'deg;--from:' + (i % 2 ? '60vw' : '-60vw') + '"></i>';
      });
      for (var s = 0; s < 9; s++) { out += '<i class="sc-dust" style="--a:' + (s * 40) + 'deg;--d:' + (300 + s * 30) + 'ms"></i>'; }
    } else if (theme === 'roof') {
      for (var row = 0; row < n; row++) {
        for (var c = 0; c < 9; c++) {
          out += '<i class="sc-tile sc-k' + ((c + row) % 3) + '" style="left:' + (2 + c * 7.2 + (row % 2 ? 3.6 : 0)) + '%;bottom:' + (10 + row * 17) + 'px;--d:' + ((row * 9 + c) * 45) + 'ms"></i>';
        }
      }
    } else if (theme === 'heavy') {
      L.items.slice(0, n).forEach(function (b, i) {
        out += '<i class="sc-block sc-k' + (i % 3) + '" style="left:calc(7% + ' + b[0] + 'px);bottom:' + (10 + b[1]) + 'px;--d:' + (i * 120) + 'ms"></i>';
      });
      for (var p2 = 0; p2 < 4; p2++) { out += '<i class="sc-puff" style="left:calc(7% + ' + (10 + p2 * 46) + 'px);--d:' + (380 + p2 * 120) + 'ms"></i>'; }
    } else if (theme === 'build') {
      out += '<i class="sc-stripe"></i>';
      L.items.slice(0, n).forEach(function (b, i) {
        out += '<i class="sc-beam" style="left:' + b[0] + '%;bottom:' + b[1] + 'px;width:' + b[2] + 'px;--d:' + (i * 160) + 'ms"></i>';
      });
    }
    if (binSize) { out += '<i class="sc-bin sc-bin--' + binSize + '"><b></b><b></b></i>'; }
    return out;
  }

  var dlg = null, el = {}, state = null, placement = 'page';

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'bf';
    dlg.id = 'binFinder';
    dlg.setAttribute('aria-labelledby', 'bfTitle');
    dlg.innerHTML =
      '<div class="bf__stage" aria-hidden="true"><div class="bf__glow"></div><div class="bf__grid"></div><div class="bf__scene" id="bfScene"></div></div>' +
      '<button class="bf__x" type="button" id="bfClose" aria-label="Close the bin finder">×</button>' +
      '<div class="bf__badge" id="bfBadge" aria-hidden="true">' + svg('junk') + '</div>' +
      '<div class="bf__body">' +
        '<div class="bf__top"><button class="bf__back" type="button" id="bfBack" hidden>← Back</button>' +
          '<ol class="bf__dots" id="bfDots" aria-hidden="true"><li></li><li></li><li></li></ol>' +
          '<span class="bf__count" id="bfCount"></span></div>' +
        '<div class="bf__pane" id="bfPane"></div>' +
      '</div>';
    document.body.appendChild(dlg);
    el = { scene: dlg.querySelector('#bfScene'), badge: dlg.querySelector('#bfBadge'), back: dlg.querySelector('#bfBack'),
      dots: [].slice.call(dlg.querySelectorAll('#bfDots li')), count: dlg.querySelector('#bfCount'), pane: dlg.querySelector('#bfPane') };
    dlg.querySelector('#bfClose').addEventListener('click', close);
    el.back.addEventListener('click', function () { if (state.step > 0) { go(state.step === 3 ? 2 : state.step - 1, -1); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { close(); } });   // backdrop
    el.pane.addEventListener('click', onPaneClick);
  }

  function open(where) {
    if (!dlg) { build(); }
    placement = where || 'page';
    state = { step: 0, answers: {}, size: null, busy: false };
    dlg.removeAttribute('data-theme');
    el.scene.innerHTML = '';
    setBadge('junk', true);
    render(0, 0);
    if (dlg.showModal) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } } else { dlg.setAttribute('open', ''); }
    track('finder_open', { placement: placement });
  }
  function close() {
    if (!dlg) { return; }
    if (dlg.close) { try { dlg.close(); return; } catch (e) {} }
    dlg.removeAttribute('open');
  }

  function setBadge(name, quiet) {
    el.badge.innerHTML = svg(name);
    if (!quiet && !reduced()) { el.badge.classList.remove('is-in'); void el.badge.offsetWidth; el.badge.classList.add('is-in'); }
  }
  function playScene(binSize) {
    var a = state.answers;
    if (!a.material) { return; }
    dlg.setAttribute('data-theme', a.material);
    el.scene.innerHTML = scene(a.material, a.scope || 'medium', binSize);
    if (a.material === 'heavy' && !reduced()) {
      var st = dlg.querySelector('.bf__stage');
      st.classList.remove('is-thud'); void st.offsetWidth; st.classList.add('is-thud');
    }
  }

  function option(kind, id, label, sub, icon, picked) {
    return '<li><button type="button" class="bf__opt' + (picked ? ' is-picked' : '') + '" data-kind="' + kind + '" data-id="' + id + '"' +
      (kind === 'material' ? ' data-theme="' + id + '"' : '') + '>' +
      '<span class="bf__oic">' + svg(icon) + '</span><span class="bf__otx"><b>' + esc(label) + '</b><i>' + esc(sub) + '</i></span></button></li>';
  }

  function render(step, dir) {
    state.step = step;
    var a = state.answers, html = '';
    if (step === 0) {
      html = '<h2 class="bf__q" id="bfTitle" tabindex="-1">What are you getting rid of?</h2><p class="bf__hint">Three quick taps and I\'ll size your bin.</p><ul class="bf__opts bf__opts--6">' +
        MATERIALS.map(function (m) { return option('material', m.id, m.label, m.sub, m.id, a.material === m.id); }).join('') + '</ul>';
    } else if (step === 1) {
      html = '<h2 class="bf__q" id="bfTitle" tabindex="-1">How big is the job?</h2><p class="bf__hint">A rough guess is fine.</p><ul class="bf__opts">' +
        SCOPES[a.material].map(function (s, i) { return option('scope', SCOPE_IDS[i], s[0], s[1], 's' + (i + 1), a.scope === SCOPE_IDS[i]); }).join('') + '</ul>';
    } else if (step === 2) {
      html = '<h2 class="bf__q" id="bfTitle" tabindex="-1">Where will the bin sit?</h2><p class="bf__hint">So you know about permits and space up front.</p><ul class="bf__opts">' +
        PLACES.map(function (p) { return option('place', p.id, p.label, p.sub, p.id, a.place === p.id); }).join('') + '</ul>';
    } else {
      html = resultHTML();
    }
    el.back.hidden = step === 0;
    el.count.textContent = step < 3 ? (step + 1) + ' of 3' : 'Your bin';
    el.dots.forEach(function (d, i) { d.className = i < step ? 'is-done' : (i === step ? 'is-on' : ''); });
    el.pane.innerHTML = html;
    el.pane.classList.remove('is-fwd', 'is-back');
    if (dir && !reduced()) { void el.pane.offsetWidth; el.pane.classList.add(dir < 0 ? 'is-back' : 'is-fwd'); }
    dlg.querySelector('.bf__body').scrollTop = 0;
    var h = el.pane.querySelector('.bf__q');
    if (h && dir) { h.focus({ preventScroll: true }); }
  }
  function go(step, dir) {
    if (step < 3) { state.size = null; }
    if (step === 3) {
      var rec = recommendBin(state.answers);
      state.rec = rec; state.size = state.size || rec.size;
      setBadge('check');
      track('finder_result', { bin: rec.size, material: state.answers.material, scope: state.answers.scope, place: state.answers.place });
    } else if (state.answers.material) { setBadge(state.answers.material, true); }
    if (dir < 0) { playScene(null); }     // going forward the tap already played the scene; going back, the bin rolls away
    render(step, dir);
  }

  function onPaneClick(e) {
    var b = e.target.closest && e.target.closest('.bf__opt');
    if (b) {
      if (state.busy) { return; }
      var kind = b.getAttribute('data-kind'), id = b.getAttribute('data-id');
      state.answers[kind] = id;
      if (kind === 'material') { state.answers.scope = null; state.answers.place = null; }
      [].forEach.call(el.pane.querySelectorAll('.bf__opt'), function (o) { o.classList.toggle('is-picked', o === b); });
      track('finder_answer', { step: state.step + 1, answer: id });
      if (kind === 'material') { setBadge(id); }
      var rec = kind === 'place' ? recommendBin(state.answers) : null;
      playScene(rec ? rec.size : null);
      state.busy = true;
      setTimeout(function () { state.busy = false; go(state.step + 1, 1); }, reduced() ? 80 : (kind === 'place' ? 950 : 700));
      return;
    }
    var act = e.target.closest && e.target.closest('[data-act]');
    if (!act) { return; }
    var what = act.getAttribute('data-act');
    if (what === 'switch') {
      state.size = state.size === 15 ? 30 : 15;
      track('finder_switch', { bin: state.size });
      playScene(state.size);
      render(3, 0);
    } else if (what === 'restart') {
      state.answers = {}; state.size = null; dlg.removeAttribute('data-theme'); el.scene.innerHTML = ''; setBadge('junk', true); render(0, -1);
    } else if (what === 'quote') {
      pick();
    }
  }

  function resultHTML() {
    var a = state.answers, rec = state.rec, size = state.size, bin = BINS[size], m = material(a.material);
    var mine = size === rec.size;
    var scopeLabel = SCOPES[a.material][SCOPE_IDS.indexOf(a.scope)][0];
    var place = PLACES.filter(function (p) { return p.id === a.place; })[0];
    var reasons = mine ? rec.reasons : ['You asked to see the ' + size + ' yard instead. ' + binLine(size), BILLING];
    return '<p class="bf__eyebrow">' + (mine ? 'My pick for you' : 'The other size') + '</p>' +
      '<h2 class="bf__q bf__q--res" id="bfTitle" tabindex="-1">' + esc(mine ? rec.headline : 'Here is the ' + size + ' yard for your ' + m.noun + '.') + '</h2>' +
      '<ul class="bf__chips"><li>' + esc(m.label) + '</li><li>' + esc(scopeLabel) + '</li><li>' + esc(place.label) + '</li>' +
        '<li><button type="button" class="bf__link" data-act="restart">Change answers</button></li></ul>' +
      '<div class="bf__bin"><img src="/assets/bin-' + size + '.svg" alt="Scale diagram of the ' + size + ' yard roll-off bin" width="' + bin.w + '" height="' + bin.h + '">' +
        '<dl><div><dt>Size</dt><dd>' + size + ' yard</dd></div><div><dt>Outside</dt><dd>' + esc(bin.dims) + '</dd></div>' +
        '<div><dt>Carries</dt><dd>' + lbs(bin.lbs) + ' lbs</dd></div><div><dt>Included</dt><dd>First ton, 14 days</dd></div></dl></div>' +
      '<ul class="bf__why">' + reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      (rec.notes.length ? '<ul class="bf__notes">' + rec.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="bf__acts">' +
        '<button type="button" class="btn btn--red btn--big btn--full" data-act="quote">Get a quote for this ' + size + ' yard <svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
        '<button type="button" class="btn btn--line btn--full" data-act="switch">Show me the ' + (size === 15 ? 30 : 15) + ' yard instead</button>' +
      '</div>' +
      '<p class="bf__fine">On the fence? Text <a href="sms:8017854494">(801) 785-4494</a> what you\'re throwing away and dispatch will size it for you.</p>';
  }

  /* hand the pick to the quote form: a page with the form takes it in place; any other page
     carries it to the homepage form through sessionStorage */
  function pick() {
    var a = state.answers, m = material(a.material);
    var scopeLabel = SCOPES[a.material][SCOPE_IDS.indexOf(a.scope)][0];
    var place = PLACES.filter(function (p) { return p.id === a.place; })[0];
    var detail = {
      size: state.size + ' yard bin', material: a.material,
      note: 'Bin finder: ' + m.label.toLowerCase() + ', ' + scopeLabel.toLowerCase() + ', ' + place.label.toLowerCase() + '.' + (m.heavy ? ' Heavy material.' : '')
    };
    track('finder_quote', { bin: state.size, material: a.material, placement: placement });
    var ev;
    try { ev = new CustomEvent('bear:finder-pick', { cancelable: true, detail: detail }); } catch (err) { ev = null; }
    var handled = ev ? !document.dispatchEvent(ev) : false;
    close();
    if (!handled) {
      try { sessionStorage.setItem('bear.finder', JSON.stringify(detail)); } catch (err) {}
      location.href = '/#request';
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-finder-open]');
    if (!t) { return; }
    e.preventDefault();
    open(t.getAttribute('data-finder-open'));
  });
  if (location.hash === '#find-my-bin') { open('link'); }
})();
