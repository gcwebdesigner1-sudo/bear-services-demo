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
  function closeNav() {
    mobnav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', function () {
    var open = mobnav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ── footer year ── */
  document.getElementById('yr').textContent = new Date().getFullYear();
})();
