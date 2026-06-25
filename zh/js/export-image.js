(function () {
  const EXPORT_MODES = {
    base: '基础站位',
    serve: '发球站位',
    receive: '接发球站位',
    serveReceive: '发 / 接发球站位'
  };

  document.addEventListener('DOMContentLoaded', function () {
    injectExportButton();
    injectExportModal();
  });

  function injectExportButton() {
    const actions = document.querySelector('.preset-actions');
    if (!actions || document.getElementById('tactics-export-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'tactics-export-btn';
    btn.className = 'preset-icon-btn';
    btn.title = '保存战术长图';
    btn.textContent = '存';
    btn.onclick = showTacticsExportModal;

    actions.appendChild(btn);
  }

  function injectExportModal() {
    if (document.getElementById('tactics-export-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'tactics-export-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content tactics-export-modal">
        <div class="modal-header">
          <span class="modal-title">保存战术长图</span>
          <span class="close-modal" onclick="closeTacticsExportModal()">×</span>
        </div>
        <div class="modal-body tactics-export-body">
          <button class="export-mode-btn" onclick="exportTacticsLongImage('base')">
            方式1：基础站位
          </button>
          <button class="export-mode-btn" onclick="exportTacticsLongImage('serve')">
            方式2：发球站位
          </button>
          <button class="export-mode-btn" onclick="exportTacticsLongImage('receive')">
            方式3：接发球站位
          </button>
          <button class="export-mode-btn" onclick="exportTacticsLongImage('serveReceive')">
            方式4：发&接发站位
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    injectExportStyles();
  }

  function injectExportStyles() {
    if (document.getElementById('tactics-export-style')) return;

    const style = document.createElement('style');
    style.id = 'tactics-export-style';
    style.textContent = `
      .tactics-export-modal {
        max-width: 360px;
      }

      .tactics-export-body {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .export-mode-btn {
        width: 100%;
        height: 3rem;
        border: 1px solid #FF6B9D;
        border-radius: 0.75rem;
        background: #FFFFFF;
        color: #FF6B9D;
        font-size: 1rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
      }

      .export-mode-btn:hover {
        background: #FFF5F7;
      }
    `;

    document.head.appendChild(style);
  }

  window.showTacticsExportModal = function () {
    const modal = document.getElementById('tactics-export-modal');
    if (modal) modal.classList.add('show');
  };

  window.closeTacticsExportModal = function () {
    const modal = document.getElementById('tactics-export-modal');
    if (modal) modal.classList.remove('show');
  };

  window.exportTacticsLongImage = function (mode) {
    closeTacticsExportModal();

    const title = getExportTitle();
    const layout = getLayout(mode);
    const scale = Math.max(2, window.devicePixelRatio || 1);

    const canvas = document.createElement('canvas');
    canvas.width = layout.width * scale;
    canvas.height = layout.height * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    drawBackground(ctx, layout);
    drawMainTitle(ctx, title, mode, layout);

    let y = layout.titleHeight;

    for (let displayRotation = 1; displayRotation <= TOTAL_ROTATIONS; displayRotation++) {
      const effectiveRotation = getEffectiveRotation(displayRotation);
      const players = getAllPlayersPositions(effectiveRotation);

      drawRotationTitle(ctx, displayRotation, y, layout);
      y += layout.rotationTitleHeight;

      if (mode === 'serveReceive') {
        drawCourtCaption(ctx, '发球站位', layout.margin, y, layout.courtWidth);
        drawCourtCaption(ctx, '接发球站位', layout.margin + layout.courtWidth + layout.gap, y, layout.courtWidth);
        y += layout.captionHeight;

        drawCourt(ctx, layout.margin, y, layout.courtWidth, layout.courtHeight, players, 'serve', effectiveRotation);
        drawCourt(ctx, layout.margin + layout.courtWidth + layout.gap, y, layout.courtWidth, layout.courtHeight, players, 'receive', effectiveRotation);
        y += layout.courtHeight;
      } else {
        drawCourt(ctx, layout.margin, y, layout.courtWidth, layout.courtHeight, players, mode, effectiveRotation);
        y += layout.courtHeight;
      }

      y += layout.sectionPadding;
      drawDivider(ctx, y, layout);
      y += layout.dividerGap;
    }

    downloadCanvas(canvas, `${title}-${EXPORT_MODES[mode]}.png`);
  };

  function getExportTitle() {
    const input = document.getElementById('formation-title-input');
    const title = input ? input.value.trim() : '';
    return title || gameState.formationTitle || '战术站位';
  }

  function getLayout(mode) {
    const margin = 48;
    const gap = 36;
    const titleHeight = 96;
    const rotationTitleHeight = 44;
    const captionHeight = 32;
    const sectionPadding = 28;
    const dividerGap = 28;

    if (mode === 'serveReceive') {
      const courtWidth = 500;
      const courtHeight = 375;
      const sectionHeight = rotationTitleHeight + captionHeight + courtHeight + sectionPadding + dividerGap;

      return {
        mode,
        width: margin * 2 + courtWidth * 2 + gap,
        height: titleHeight + TOTAL_ROTATIONS * sectionHeight,
        margin,
        gap,
        titleHeight,
        rotationTitleHeight,
        captionHeight,
        courtWidth,
        courtHeight,
        sectionPadding,
        dividerGap
      };
    }

    const courtWidth = 760;
    const courtHeight = 570;
    const sectionHeight = rotationTitleHeight + courtHeight + sectionPadding + dividerGap;

    return {
      mode,
      width: margin * 2 + courtWidth,
      height: titleHeight + TOTAL_ROTATIONS * sectionHeight,
      margin,
      gap,
      titleHeight,
      rotationTitleHeight,
      captionHeight,
      courtWidth,
      courtHeight,
      sectionPadding,
      dividerGap
    };
  }

  function drawBackground(ctx, layout) {
    ctx.fillStyle = '#FFF5F7';
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  function drawMainTitle(ctx, title, mode, layout) {
    ctx.fillStyle = '#C44569';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${title} - ${EXPORT_MODES[mode]}`, layout.width / 2, 44);
  }

  function getRotationScorePoints(displayRotation) {
    const start = displayRotation - 1;
    const scores = [];

    for (let score = start; score <= 21; score += TOTAL_ROTATIONS) {
      scores.push(score);
    }

    return scores;
  }

  function drawRotationTitle(ctx, displayRotation, y, layout) {
    const scores = getRotationScorePoints(displayRotation);
    const baseText = `第${displayRotation}轮：对应分数`;

    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let x = layout.margin;
    const centerY = y + 22;

    ctx.fillStyle = '#333333';
    ctx.fillText(baseText, x, centerY);
    x += ctx.measureText(baseText).width + 12;

    scores.forEach(score => {
      const text = String(score);

      ctx.fillStyle = (score === 15 || score === 21)
        ? '#E53935'
        : '#333333';

      ctx.fillText(text, x, centerY);
      x += ctx.measureText(text).width + 14;
    });
  }

  function drawCourtCaption(ctx, text, x, y, width) {
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + 16);
  }

  function drawDivider(ctx, y, layout) {
    ctx.strokeStyle = '#FFD6E2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(layout.margin, y);
    ctx.lineTo(layout.width - layout.margin, y);
    ctx.stroke();
  }

  function drawCourt(ctx, x, y, width, height, players, mode, effectiveRotation) {
    ctx.save();

    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(x, y, width, height);

    drawCourtLines(ctx, x, y, width, height);
    drawPositionLabels(ctx, x, y, width, height);

    players.forEach(player => {
      const coords = getExportCoords(player, mode, effectiveRotation);
      drawPlayer(ctx, x, y, width, height, player, coords);
    });

    ctx.restore();
  }

  function drawCourtLines(ctx, x, y, width, height) {
    const left = x + width * 0.03;
    const right = x + width * 0.97;
    const top = y + height * 0.02;
    const bottom = y + height * 0.98;

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right, top);
    ctx.stroke();

    ctx.fillStyle = '#444444';
    ctx.fillRect(left, top, right - left, 5);

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.035, y + height * 0.333);
    ctx.lineTo(x + width * 0.965, y + height * 0.333);
    ctx.stroke();
  }

  function drawPositionLabels(ctx, x, y, width, height) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.font = `900 ${Math.round(width * 0.24)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    Object.keys(POSITION_COORDS).forEach(pos => {
      const coords = POSITION_COORDS[pos];
      ctx.fillText(
        pos,
        x + (coords.x / 100) * width,
        y + (coords.y / 100) * height
      );
    });
  }

  function drawPlayer(ctx, courtX, courtY, courtWidth, courtHeight, player, coords) {
    const cx = courtX + (coords.x / 100) * courtWidth;
    const cy = courtY + (coords.y / 100) * courtHeight;
    const radius = Math.max(32, courtWidth * 0.073); // 球员大小调整

    const isHighlight = player.role === 'setter';

    const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    if (isHighlight) {
      gradient.addColorStop(0, '#FFD54F');
      gradient.addColorStop(1, '#FFC107');
    } else {
      gradient.addColorStop(0, '#90A4AE');
      gradient.addColorStop(1, '#546E7A');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(radius * 0.46)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = getPlayerDisplayName(player);
    ctx.fillText(label, cx, cy);
  }

  function getPlayerDisplayName(player) {
    const nameKey = player.nameKey || player.id;
    return gameState.customNames[nameKey] || player.name;
  }

  function getExportCoords(player, mode, effectiveRotation) {
    if (mode === 'base') {
      return getPositionCoords(player.position);
    }

    const scene = mode === 'receive' ? 'receive' : 'serve';
    const rotationKey = String(effectiveRotation);
    const posKey = String(player.position);

    return (
      gameState.customPositions[scene]?.[rotationKey]?.[posKey] ||
      player.coords ||
      getPositionCoords(player.position)
    );
  }

  function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = sanitizeFilename(filename);
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function sanitizeFilename(filename) {
    return filename.replace(/[\\/:*?"<>|]/g, '_');
  }
})();