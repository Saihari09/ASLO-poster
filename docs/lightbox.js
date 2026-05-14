(function () {
  const triggers = Array.from(document.querySelectorAll('[data-lightbox]'));
  if (!triggers.length) return;

  const lb = document.getElementById('lightbox');
  const stage = lb.querySelector('.lb-stage');
  const img = lb.querySelector('.lb-img');
  const caption = lb.querySelector('.lb-caption');
  const btnClose = lb.querySelector('.lb-close');
  const btnPrev = lb.querySelector('.lb-prev');
  const btnNext = lb.querySelector('.lb-next');

  let index = 0;
  let scale = 1;
  let tx = 0, ty = 0;
  let baseW = 0, baseH = 0;
  let dragging = false;
  let startX = 0, startY = 0;
  let lastTx = 0, lastTy = 0;
  let lastTouchDist = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 6;

  function applyTransform() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function fitImageToStage() {
    const stageRect = stage.getBoundingClientRect();
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) { baseW = stageRect.width; baseH = stageRect.height; return; }
    const sw = stageRect.width / natW;
    const sh = stageRect.height / natH;
    const s = Math.min(sw, sh, 1);
    baseW = natW * s;
    baseH = natH * s;
    img.style.width = baseW + 'px';
    img.style.height = baseH + 'px';
    scale = 1;
    tx = (stageRect.width - baseW) / 2;
    ty = (stageRect.height - baseH) / 2;
    applyTransform();
  }

  function clampPan() {
    const stageRect = stage.getBoundingClientRect();
    const w = baseW * scale;
    const h = baseH * scale;
    if (w <= stageRect.width) {
      tx = (stageRect.width - w) / 2;
    } else {
      const minX = stageRect.width - w;
      const maxX = 0;
      tx = Math.min(maxX, Math.max(minX, tx));
    }
    if (h <= stageRect.height) {
      ty = (stageRect.height - h) / 2;
    } else {
      const minY = stageRect.height - h;
      const maxY = 0;
      ty = Math.min(maxY, Math.max(minY, ty));
    }
  }

  function zoomAt(clientX, clientY, factor) {
    const stageRect = stage.getBoundingClientRect();
    const px = clientX - stageRect.left;
    const py = clientY - stageRect.top;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (newScale === scale) return;
    const ratio = newScale / scale;
    tx = px - (px - tx) * ratio;
    ty = py - (py - ty) * ratio;
    scale = newScale;
    clampPan();
    applyTransform();
  }

  function open(i) {
    index = (i + triggers.length) % triggers.length;
    const t = triggers[index];
    const src = t.getAttribute('data-src');
    const cap = t.getAttribute('data-caption') || '';
    img.src = src;
    img.alt = cap;
    caption.textContent = cap;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (img.complete) fitImageToStage();
    else img.addEventListener('load', fitImageToStage, { once: true });
  }

  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    img.src = '';
    scale = 1; tx = 0; ty = 0;
  }

  function next(step) {
    open(index + step);
  }

  triggers.forEach((t, i) => {
    t.addEventListener('click', (e) => { e.preventDefault(); open(i); });
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => next(-1));
  btnNext.addEventListener('click', () => next(1));

  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') next(-1);
    else if (e.key === 'ArrowRight') next(1);
    else if (e.key === '0') { fitImageToStage(); }
    else if (e.key === '+' || e.key === '=') {
      const r = stage.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25);
    } else if (e.key === '-') {
      const r = stage.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.8);
    }
  });

  stage.addEventListener('wheel', (e) => {
    if (!lb.classList.contains('is-open')) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  img.addEventListener('dblclick', (e) => {
    if (scale > 1.01) {
      fitImageToStage();
    } else {
      zoomAt(e.clientX, e.clientY, 2.4);
    }
  });

  img.addEventListener('pointerdown', (e) => {
    dragging = true;
    img.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    lastTx = tx;
    lastTy = ty;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tx = lastTx + (e.clientX - startX);
    ty = lastTy + (e.clientY - startY);
    clampPan();
    applyTransform();
  });
  img.addEventListener('pointerup', (e) => {
    dragging = false;
    img.classList.remove('is-dragging');
    try { img.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  img.addEventListener('pointercancel', () => {
    dragging = false;
    img.classList.remove('is-dragging');
  });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (lastTouchDist) {
        const factor = dist / lastTouchDist;
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        zoomAt(cx, cy, factor);
      }
      lastTouchDist = dist;
    }
  }, { passive: false });
  stage.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) lastTouchDist = 0;
  });

  window.addEventListener('resize', () => {
    if (lb.classList.contains('is-open')) fitImageToStage();
  });
})();
