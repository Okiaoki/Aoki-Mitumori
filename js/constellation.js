/**
 * constellation.js
 * サービスセクション背景のコンステレーション（星座）アニメーション
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById("constellationCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const DOTS      = 55;
  const MAX_DIST  = 130;
  const SPEED     = 0.15; // 極めてゆっくり

  let dots = [];
  let W, H, raf;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function init() {
    resize();
    dots = Array.from({ length: DOTS }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r:  Math.random() * 1.2 + 0.4,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // ドット移動 & 壁バウンド
    dots.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > W) d.vx *= -1;
      if (d.y < 0 || d.y > H) d.vy *= -1;
    });

    // 接続線
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx   = dots[i].x - dots[j].x;
        const dy   = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }
    }

    // ドット描画
    dots.forEach(d => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240,235,224,0.45)";
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  // リサイズ対応（デバウンス）
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); }, 200);
  });

  // ドットの初期化を先に行う（IntersectionObserverより前に実行）
  init();

  // Intersection Observer で画面内のときだけ動かす（パフォーマンス）
  const section = document.getElementById("service");
  if (section && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          if (!raf) draw();
        } else {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0.05 });
    obs.observe(section);
  } else {
    draw();
  }
})();
