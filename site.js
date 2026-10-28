// Gentle fade-in as things scroll into view. Content stays visible if this file fails.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');
  var els = document.querySelectorAll('.sec-head, .proj, .small-projects > div, .log li, .role, .skills, .art figure');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) { el.classList.add('rise'); io.observe(el); });
})();
