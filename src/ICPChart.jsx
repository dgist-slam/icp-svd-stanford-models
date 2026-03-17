import { useRef, useEffect } from 'react';

const W = 280, H = 160;
const PAD = { top: 24, right: 12, bottom: 28, left: 44 };

export default function ICPChart({ history }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Data
    const rots = history.map(h => h.rotDeg);
    const trans = history.map(h => h.transNorm);
    const n = history.length;

    const maxRot = Math.max(...rots, 1e-6);
    const maxTrans = Math.max(...trans, 1e-6);

    // Background
    ctx.fillStyle = 'rgba(12, 12, 30, 0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 8);
    ctx.fill();

    // Title
    ctx.fillStyle = '#999';
    ctx.font = '11px monospace';
    ctx.fillText('Per-Iteration Pose Delta', PAD.left, 14);

    // Grid lines
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + plotW, y);
      ctx.stroke();
    }

    // X axis labels
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const xStep = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += xStep) {
      const x = PAD.left + (i / Math.max(n - 1, 1)) * plotW;
      ctx.fillText(i + 1, x, H - 6);
    }
    if (n > 1) {
      const xLast = PAD.left + plotW;
      ctx.fillText(n, xLast, H - 6);
    }
    ctx.fillText('iter', PAD.left + plotW / 2, H - 0);

    // Helper: draw line
    function drawLine(data, maxVal, color) {
      if (n < 1) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const y = PAD.top + plotH - (data[i] / maxVal) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw dots
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const x = PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const y = PAD.top + plotH - (data[i] / maxVal) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Y axis labels (left = rotation orange, right hint = translation blue)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ee8833';
    ctx.font = '9px monospace';
    ctx.fillText(maxRot.toFixed(1) + '°', PAD.left - 4, PAD.top + 3);
    ctx.fillText('0', PAD.left - 4, PAD.top + plotH + 3);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#4499ff';
    ctx.fillText(maxTrans.toFixed(3), PAD.left + plotW + 2, PAD.top + 3);

    // Draw lines
    drawLine(rots, maxRot, '#ee8833');
    drawLine(trans, maxTrans, '#4499ff');

    // Legend
    ctx.font = '9px monospace';
    const legX = PAD.left + 4;
    const legY = PAD.top + 12;
    ctx.fillStyle = '#ee8833';
    ctx.fillRect(legX, legY - 5, 10, 2);
    ctx.fillText(' ||rot|| (deg)', legX + 12, legY);
    ctx.fillStyle = '#4499ff';
    ctx.fillRect(legX, legY + 7, 10, 2);
    ctx.fillText(' ||trans||', legX + 12, legY + 12);

  }, [history]);

  return (
    <div className="icp-chart">
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H }}
      />
    </div>
  );
}
