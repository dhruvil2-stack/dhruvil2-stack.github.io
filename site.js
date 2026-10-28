// Gentle fade-in, plus a zoomable image viewer.
// Everything stays usable if this file fails to load.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Fade-in ----------
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    var els = document.querySelectorAll('.sec-head, .proj, .small-projects > div, .log li, .role, .skills, .art figure');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { el.classList.add('rise'); io.observe(el); });
  }

  // ---------- Image viewer ----------
  var imgs = document.querySelectorAll('.proj .pic img, .art figure img');
  if (!imgs.length) return;

  var box = document.createElement('div');
  box.className = 'viewer';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image viewer');
  box.hidden = true;
  box.innerHTML =
    '<div class="viewer-stage"><img class="viewer-img" alt="" draggable="false"></div>' +
    '<button type="button" class="viewer-close" aria-label="Close image">&#x2715;</button>' +
    '<p class="viewer-cap"></p>' +
    '<p class="viewer-hint">Scroll or pinch to zoom · double-click to zoom in or out · drag to move</p>';
  document.body.appendChild(box);

  var stage = box.querySelector('.viewer-stage');
  var big = box.querySelector('.viewer-img');
  var cap = box.querySelector('.viewer-cap');
  var closeBtn = box.querySelector('.viewer-close');
  var lastFocus = null;

  var scale = 1, x = 0, y = 0, baseW = 0, baseH = 0;
  var MIN = 1, MAX = 8;
  var pointers = new Map(), pinchStart = null, dragStart = null;

  function apply() { big.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'; }

  function fit() {
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var nw = big.naturalWidth || 1, nh = big.naturalHeight || 1;
    var f = Math.min((sw * 0.92) / nw, (sh * 0.86) / nh, 2.5);
    baseW = nw * f; baseH = nh * f;
    big.style.width = baseW + 'px'; big.style.height = baseH + 'px';
    scale = 1; x = (sw - baseW) / 2; y = (sh - baseH) / 2;
    apply();
  }

  function keepInView() {
    var sw = stage.clientWidth, sh = stage.clientHeight, w = baseW * scale, h = baseH * scale;
    x = w <= sw ? (sw - w) / 2 : Math.min(0, Math.max(sw - w, x));
    y = h <= sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, y));
  }

  function zoomAt(cx, cy, next) {
    next = Math.min(MAX, Math.max(MIN, next));
    x = cx - (cx - x) * (next / scale);
    y = cy - (cy - y) * (next / scale);
    scale = next;
    keepInView(); apply();
  }

  function open(img) {
    lastFocus = document.activeElement;
    var fig = img.closest('figure');
    var fc = fig && fig.querySelector('figcaption');
    cap.textContent = fc ? fc.textContent : (img.alt || '');
    big.alt = img.alt || '';
    big.classList.toggle('dark', !!img.closest('.dark'));
    box.hidden = false;
    document.documentElement.classList.add('viewing');
    big.onload = fit;
    big.src = img.currentSrc || img.src;
    if (big.complete && big.naturalWidth) fit();
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    document.documentElement.classList.remove('viewing');
    big.removeAttribute('src');
    pointers.clear(); pinchStart = null; dragStart = null;
    if (lastFocus) lastFocus.focus();
  }

  imgs.forEach(function (img) {
    img.classList.add('zoomable');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Enlarge image: ' + (img.alt || 'figure'));
    img.addEventListener('click', function () { open(img); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });

  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    if (e.key === '+' || e.key === '=') zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, scale * 1.4);
    if (e.key === '-') zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, scale / 1.4);
  });
  window.addEventListener('resize', function () { if (!box.hidden) fit(); });

  // Click on the dark area (not the picture) closes it
  stage.addEventListener('click', function (e) {
    if (e.target === stage && scale === 1 && !stage.dataset.moved) close();
  });

  // Scroll wheel zooms around the cursor
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    zoomAt(e.clientX - r.left, e.clientY - r.top, scale * Math.exp(-dy * 0.0018));
  }, { passive: false });

  // Double-click / double-tap toggles between fit and 2.5x
  var lastTap = 0;
  function toggleZoom(cx, cy) {
    if (scale > 1.05) { fit(); } else { zoomAt(cx, cy, 2.5); }
  }
  stage.addEventListener('dblclick', function (e) {
    var r = stage.getBoundingClientRect();
    toggleZoom(e.clientX - r.left, e.clientY - r.top);
  });

  // Drag to pan, two fingers to pinch
  stage.addEventListener('pointerdown', function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    delete stage.dataset.moved;
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      pinchStart = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), s: scale };
      dragStart = null;
    } else if (pointers.size === 1) {
      dragStart = { px: e.clientX, py: e.clientY, x: x, y: y };
      if (e.pointerType === 'touch') {
        var now = Date.now();
        if (now - lastTap < 300) {
          var r = stage.getBoundingClientRect();
          toggleZoom(e.clientX - r.left, e.clientY - r.top);
          lastTap = 0;
        } else { lastTap = now; }
      }
    }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var r = stage.getBoundingClientRect();
    if (pointers.size === 2 && pinchStart) {
      var p = Array.from(pointers.values());
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var cx = (p[0].x + p[1].x) / 2 - r.left, cy = (p[0].y + p[1].y) / 2 - r.top;
      zoomAt(cx, cy, pinchStart.s * (d / pinchStart.d));
      stage.dataset.moved = '1';
    } else if (dragStart && scale > 1) {
      x = dragStart.x + (e.clientX - dragStart.px);
      y = dragStart.y + (e.clientY - dragStart.py);
      if (Math.abs(e.clientX - dragStart.px) + Math.abs(e.clientY - dragStart.py) > 4) stage.dataset.moved = '1';
      keepInView(); apply();
    }
  });
  function lift(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 1) {
      var p = Array.from(pointers.values())[0];
      dragStart = { px: p.x, py: p.y, x: x, y: y };
    } else if (pointers.size === 0) { dragStart = null; }
  }
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
})();
