// ========== 站位编辑函数 ==========

function getCurrentEffectiveRotation() {
  return getEffectiveRotation(gameState.currentRotation);
}

function clonePositionMap(map) {
  return JSON.parse(JSON.stringify(map || {}));
}

function getPositionSceneBucket(source, scene, rotation) {
  const sceneKey = scene || 'serve';
  const rotationKey = String(rotation);

  if (!source[sceneKey]) source[sceneKey] = {};
  if (!source[sceneKey][rotationKey]) source[sceneKey][rotationKey] = {};

  return source[sceneKey][rotationKey];
}

function getPlayerRenderCoords(player) {
  if (gameState.isOriginalPosition) {
    return getPositionCoords(player.position);
  }

  const scene = gameState.positionScene || 'serve';
  const rotation = String(getCurrentEffectiveRotation());
  const pos = String(player.position);

  return (
    gameState.draftPositions[scene]?.[rotation]?.[pos] ||
    gameState.customPositions[scene]?.[rotation]?.[pos] ||
    player.coords ||
    getPositionCoords(player.position)
  );
}

function beginPositionEdit() {
  gameState.isEditingPositions = true;
  gameState.draftPositions = clonePositionMap(gameState.customPositions);

  const scene = gameState.positionScene || 'serve';
  const rotation = getCurrentEffectiveRotation();
  const bucket = getPositionSceneBucket(gameState.draftPositions, scene, rotation);

  gameState.players.forEach(player => {
    const pos = String(player.position);
    if (!bucket[pos]) {
      bucket[pos] = getPlayerRenderCoords(player);
    }
  });
}

function savePositionDraft() {
  const scene = gameState.positionScene || 'serve';
  const rotation = getCurrentEffectiveRotation();
  const bucket = getPositionSceneBucket(gameState.draftPositions, scene, rotation);

  gameState.players.forEach(player => {
    const el = document.getElementById(player.id);
    if (!el) return;

    bucket[String(player.position)] = {
      x: Number((parseFloat(el.style.left) || 0).toFixed(1)),
      y: Number((parseFloat(el.style.top) || 0).toFixed(1))
    };
  });

  gameState.customPositions = clonePositionMap(gameState.draftPositions);
  saveCustomPositions();
}

function resetCurrentRotationPositionsToBase() {
  if (!gameState.isEditingPositions || gameState.isOriginalPosition) return;

  const scene = gameState.positionScene || 'serve';
  const rotation = getCurrentEffectiveRotation();
  const bucket = getPositionSceneBucket(gameState.draftPositions, scene, rotation);

  gameState.players.forEach(player => {
    bucket[String(player.position)] = {
      ...getPositionCoords(player.position)
    };
  });

  renderPlayers();
  updateUI();
}

function exitPositionEdit() {
  gameState.isEditingPositions = false;
  gameState.draftPositions = {};
}

function togglePositionEdit() {
  if (gameState.isOriginalPosition) return;

  if (gameState.isEditingPositions) {
    savePositionDraft();
    exitPositionEdit();

    // 先退出编辑样式，再重新渲染，保证球员移动动画恢复
    updateUI();
    renderPlayers();
    return;
  }

  beginPositionEdit();
  updateUI();
  renderPlayers();
}

function bindPlayerDrag(playerDiv, player) {
  playerDiv.onpointerdown = null;

  const canDrag = gameState.isEditingPositions && !gameState.isOriginalPosition;
  playerDiv.style.touchAction = canDrag ? 'none' : '';

  if (!canDrag) return;

  playerDiv.onpointerdown = function (e) {
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const court = document.getElementById('court');
    if (!court) return;

    const rect = court.getBoundingClientRect();
    const currentX = parseFloat(playerDiv.style.left) || 50;
    const currentY = parseFloat(playerDiv.style.top) || 50;
    const startPointerX = ((e.clientX - rect.left) / rect.width) * 100;
    const startPointerY = ((e.clientY - rect.top) / rect.height) * 100;
    const offsetX = currentX - startPointerX;
    const offsetY = currentY - startPointerY;

    const radiusX = (playerDiv.offsetWidth / 2 / rect.width) * 100;
    const radiusY = (playerDiv.offsetHeight / 2 / rect.height) * 100;

    playerDiv.setPointerCapture?.(e.pointerId);
    playerDiv.classList.add('dragging');

    const moveTo = evt => {
      const pointerX = ((evt.clientX - rect.left) / rect.width) * 100;
      const pointerY = ((evt.clientY - rect.top) / rect.height) * 100;

      const next = {
        x: Math.min(100 - radiusX, Math.max(radiusX, Number((pointerX + offsetX).toFixed(1)))),
        y: Math.min(100 - radiusY, Math.max(radiusY, Number((pointerY + offsetY).toFixed(1))))
      };

      const scene = gameState.positionScene || 'serve';
      const rotation = getCurrentEffectiveRotation();
      const bucket = getPositionSceneBucket(gameState.draftPositions, scene, rotation);

      bucket[String(player.position)] = next;

      playerDiv.style.left = next.x + '%';
      playerDiv.style.top = next.y + '%';
    };

    const stop = () => {
      playerDiv.classList.remove('dragging');
      playerDiv.releasePointerCapture?.(e.pointerId);
      playerDiv.removeEventListener('pointermove', moveTo);
      playerDiv.removeEventListener('pointerup', stop);
      playerDiv.removeEventListener('pointercancel', stop);
    };

    playerDiv.addEventListener('pointermove', moveTo);
    playerDiv.addEventListener('pointerup', stop);
    playerDiv.addEventListener('pointercancel', stop);
  };
}