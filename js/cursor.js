/**
 * cursor.js — カスタムカーソル
 * ゴールドドット + 遅延追従リング
 * タッチデバイスは自動無効化
 */
(function () {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0;
  let rx = 0, ry = 0;
  let active = false;
  let rafId = null;

  // ── マウス位置追従 ──────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;

    if (!active) {
      rx = mx; ry = my;
      active = true;
      dot.classList.add('is-active');
      ring.classList.add('is-active');
      startLoop();
    }
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  });

  document.addEventListener('mouseleave', () => {
    dot.classList.remove('is-active');
    ring.classList.remove('is-active');
    active = false;
    stopLoop();
  });
  document.addEventListener('mouseenter', () => {
    if (!active) return;
    dot.classList.add('is-active');
    ring.classList.add('is-active');
    startLoop();
  });

  // ── リングの LERP アニメーション ────────────────────────
  function loop() {
    rx += (mx - rx) * 0.10;
    ry += (my - ry) * 0.10;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId === null) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── ページ非アクティブ時にrAFを停止 ─────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else if (active) {
      startLoop();
    }
  });

  // ── インタラクティブ要素ホバー ───────────────────────────
  const hoverSel = [
    'a', 'button', '[role="button"]', 'label',
    '.radio-card', '.checkbox-card',
    '.pricing-card', '.usecase-card',
    '.works-card', '.faq__question', '.service-card',
  ].join(',');

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverSel)) {
      dot.classList.add('is-hovered');
      ring.classList.add('is-hovered');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverSel)) {
      dot.classList.remove('is-hovered');
      ring.classList.remove('is-hovered');
    }
  });

  // ── クリック ────────────────────────────────────────────
  document.addEventListener('mousedown', () => {
    dot.classList.add('is-clicked');
    ring.classList.add('is-clicked');
  });
  document.addEventListener('mouseup', () => {
    dot.classList.remove('is-clicked');
    ring.classList.remove('is-clicked');
  });
})();
