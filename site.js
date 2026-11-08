// Loading states, the inline video, copy-email feedback, the active section in the nav,
// and a zoomable image viewer. The page stays fully usable if this file fails to load:
// images show normally, the video button is a plain link to Google Drive, and the email is a mailto link.
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');

  function icon(name) {
    return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  // ---------- Image loading state: shimmer until the picture arrives, a message if it fails ----------
  document.querySelectorAll('.panel > img').forEach(function (img) {
    var box = img.parentElement;
    box.classList.add('loadable');
    function done() { box.classList.add('loaded'); }
    function fail() { box.classList.add('failed'); }
    if (img.complete) { img.naturalWidth ? done() : fail(); }
    else { img.addEventListener('load', done); img.addEventListener('error', fail); }
  });

  // ---------- Inline video: the button is a link to Drive until clicked ----------
  document.querySelectorAll('[data-video]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var box = document.createElement('div');
      box.className = a.className;
      box.setAttribute('aria-busy', 'true');
      box.innerHTML = '<div class="loading-note" role="status"><span class="spinner"></span><span>Loading the video…</span></div>';
      var f = document.createElement('iframe');
      f.src = a.getAttribute('data-video');
      f.title = a.getAttribute('aria-label') || 'Video';
      f.allow = 'autoplay; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.style.opacity = '0';
      f.addEventListener('load', function () {
        f.style.transition = 'opacity 300ms ease'; f.style.opacity = '1';
        box.removeAttribute('aria-busy');
        var n = box.querySelector('.loading-note'); if (n) setTimeout(function () { n.remove(); }, 320);
      });
      box.appendChild(f);
      a.replaceWith(box);
      f.focus();
    });
  });

  // ---------- Copy email, with visible confirmation ----------
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var live = b.querySelector('.sr');
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      function ok() {
        b.classList.add('done');
        if (live) live.textContent = 'Email copied';
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.classList.remove('done'); if (live) live.textContent = ''; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { window.location.href = 'mailto:' + text; });
      } else { window.location.href = 'mailto:' + text; }
    });
  });

  // ---------- Active section in the top bar ----------
  var navLinks = document.querySelectorAll('.bar nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (l) { var s = document.querySelector(l.getAttribute('href')); if (s) map[s.id] = l; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var l = map[e.target.id]; if (!l) return;
        if (e.isIntersecting) { navLinks.forEach(function (x) { x.removeAttribute('aria-current'); }); l.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  // ---------- Image viewer ----------
  var imgs = document.querySelectorAll('.art figure .panel > img');
  if (!imgs.length) return;

  var lb = document.createElement('dialog');
  lb.id = 'lb';
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML =
    '<div class="lb-bar"><span class="lb-cap" id="lb-cap"></span><button class="lb-close" id="lb-close" type="button" aria-label="Close image">' + icon('close') + '</button></div>' +
    '<div class="lb-in" id="lb-in"><img id="lb-img" alt="" draggable="false"><div class="lb-spin" role="status"><span class="spinner"></span><span>Loading full size…</span></div></div>' +
    '<div class="lb-tools">' +
      '<button type="button" id="lb-out" aria-label="Zoom out">' + icon('minus') + '</button>' +
      '<span class="pct" id="lb-pct" aria-live="polite">100%</span>' +
      '<button type="button" id="lb-inb" aria-label="Zoom in">' + icon('plus') + '</button>' +
      '<button type="button" id="lb-fit" aria-label="Fit to screen">' + icon('fit') + '</button>' +
      '<span class="lb-help">Scroll or pinch to zoom, drag to move</span>' +
    '</div>';
  document.body.appendChild(lb);

  var li = lb.querySelector('#lb-img'), lc = lb.querySelector('#lb-cap'), st = lb.querySelector('#lb-in'), pct = lb.querySelector('#lb-pct');
  var S = 1, TX = 0, TY = 0, BW = 0, BH = 0, MAX = 10, ptrs = {}, pinch = null, moved = 0, last = null;
  function apply() { li.style.transform = 'translate(' + TX + 'px,' + TY + 'px) scale(' + S + ')'; pct.textContent = Math.round(S * 100) + '%'; }
  function clampPan() {
    var W = st.clientWidth, H = st.clientHeight, w = BW * S, h = BH * S;
    TX = w <= W ? (W - w) / 2 : Math.min(40, Math.max(W - w - 40, TX));
    TY = h <= H ? (H - h) / 2 : Math.min(60, Math.max(H - h - 60, TY));
  }
  function fit() {
    var W = st.clientWidth, H = st.clientHeight, nw = li.naturalWidth || 1, nh = li.naturalHeight || 1;
    var f = Math.min((W - 32) / nw, (H - 150) / nh, 2);
    BW = nw * f; BH = nh * f; li.style.width = BW + 'px'; li.style.height = BH + 'px';
    S = 1; TX = (W - BW) / 2; TY = (H - BH) / 2; apply();
  }
  function zoomAt(cx, cy, ns) { ns = Math.min(MAX, Math.max(1, ns)); TX = cx - (cx - TX) * (ns / S); TY = cy - (cy - TY) * (ns / S); S = ns; clampPan(); apply(); }
  function centre() { return [st.clientWidth / 2, st.clientHeight / 2]; }
  function open(im) {
    lb.classList.add('is-loading');
    li.onload = function () { lb.classList.remove('is-loading'); fit(); };
    li.src = im.currentSrc || im.src; li.alt = im.alt;
    li.className = im.closest('.dark') ? 'dark' : '';
    var fig = im.closest('figure'), cap = fig && fig.querySelector('figcaption');
    lc.textContent = cap ? cap.textContent : (im.alt || '');
    if (lb.showModal) { lb.showModal(); } else { lb.setAttribute('open', ''); }
    if (li.complete && li.naturalWidth) { lb.classList.remove('is-loading'); fit(); }
  }
  imgs.forEach(function (im) {
    im.classList.add('zoomable');
    im.setAttribute('tabindex', '0');
    im.setAttribute('role', 'button');
    im.setAttribute('aria-label', 'Enlarge image: ' + (im.alt || 'figure'));
    im.addEventListener('click', function () { open(im); });
    im.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(im); } });
  });
  st.addEventListener('wheel', function (e) {
    e.preventDefault(); var r = st.getBoundingClientRect();
    var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; zoomAt(e.clientX - r.left, e.clientY - r.top, S * Math.exp(-dy * 0.0018));
  }, { passive: false });
  st.addEventListener('pointerdown', function (e) {
    st.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY]; moved = 0;
    var k = Object.keys(ptrs);
    if (k.length === 2) { var a = ptrs[k[0]], b = ptrs[k[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: S }; }
    else { last = [e.clientX, e.clientY]; st.classList.add('dragging'); }
  });
  st.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = [e.clientX, e.clientY]; var k = Object.keys(ptrs);
    if (k.length === 2 && pinch) {
      var a = ptrs[k[0]], b = ptrs[k[1]], r = st.getBoundingClientRect(); moved += 10;
      zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d); return;
    }
    if (last) { var dx = e.clientX - last[0], dy = e.clientY - last[1]; moved += Math.abs(dx) + Math.abs(dy); TX += dx; TY += dy; last = [e.clientX, e.clientY]; clampPan(); apply(); }
  });
  function up(e) { delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = null; if (!Object.keys(ptrs).length) { last = null; st.classList.remove('dragging'); } }
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('dblclick', function (e) { var r = st.getBoundingClientRect(); if (S > 1.05) fit(); else zoomAt(e.clientX - r.left, e.clientY - r.top, 3); });
  st.addEventListener('click', function (e) {
    if (moved < 5) { var r = li.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) lb.close(); }
  });
  lb.querySelector('#lb-inb').addEventListener('click', function () { var c = centre(); zoomAt(c[0], c[1], S * 1.5); });
  lb.querySelector('#lb-out').addEventListener('click', function () { var c = centre(); zoomAt(c[0], c[1], S / 1.5); });
  lb.querySelector('#lb-fit').addEventListener('click', fit);
  lb.addEventListener('keydown', function (e) { var c = centre(); if (e.key === '+' || e.key === '=') zoomAt(c[0], c[1], S * 1.5); else if (e.key === '-') zoomAt(c[0], c[1], S / 1.5); else if (e.key === '0') fit(); });
  window.addEventListener('resize', function () { if (lb.open) fit(); });
  lb.querySelector('#lb-close').addEventListener('click', function () { lb.close(); });
})();
