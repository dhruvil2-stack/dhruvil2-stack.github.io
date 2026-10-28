// Motion and the live impedance chart. Everything works without this file:
// content is visible by default and the chart shows all three curves.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero: each headline line rises from behind its baseline
  var hero = document.querySelector('.hero');
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('in'); }); });

  // Section parts enter once, staggered
  document.querySelectorAll('[data-rise]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (el, i) {
      el.classList.add('rise');
      el.style.setProperty('--d', Math.min(i, 6) * 75 + 'ms');
    });
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    document.querySelectorAll('.rise').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.rise').forEach(function (el) { el.classList.add('in'); });
  }

  // Live chart: switch between measured only, one branch, and the peeled two-branch model
  var live = document.querySelector('.live');
  if (live) {
    var num = live.querySelector('.num');
    var what = live.querySelector('.what');
    var buttons = live.querySelectorAll('.controls button');
    function show(key) {
      live.setAttribute('data-show', key);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.show === key)); });
      num.textContent = live.dataset['err' + key] || '—';
      what.textContent = live.dataset['what' + key] || '';
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.show); }); });
    show('m1');
  }
})();
