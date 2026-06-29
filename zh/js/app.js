/**
 * app.js
 * 主应用逻辑（Web版）
 * 处理页面切换、动画控制、用户交互
 */

// ========== 全局状态 ==========
let currentPage = 'index'; // 当前页面：index, tutorial, setter
let gameState = {
  currentRotation: 1,              // 当前轮次 (1-6)
  rotationOffset: 0,               // 轮次偏移 (用户设置二传起始位置时改变)
  setterPosition: 2,               // 二传位置 (1-6)
  isSetterFrontRow: true,          // 二传是否在前排

  statusText: '',                  // 状态提示文字
  players: [],                     // 所有球员数据

  isAnimating: false,              // 是否正在播放动画
  isOriginalPosition: true,        // 是否显示原始站位
  positionScene: 'serve', // 当前站位场景

  customNames: {},                  // 用户自定义球员名字 (key: player-base-X)
  // 编辑模式新增变量
  isEditingPositions: false,
  customPositions: {
    serve: {},
    receive: {}
  },
  draftPositions: {},
  formationTitle: '默认站位',
};

// ========== 自定义名字持久化（localStorage，刷新不丢） ==========
const CUSTOM_NAMES_KEY = 'air_volleyball_5_custom_names';
const CUSTOM_POSITIONS_KEY = 'air_volleyball_5_custom_positions';
const DRAWER_NOTE_KEY = 'air_volleyball_5_drawer_note';
// const CUSTOM_BASE_COORDS_KEY = 'air_volleyball_5_base_coords';
const FORMATION_TITLE_KEY = 'air_volleyball_5_formation_title';
// const PRESET_SCHEMA_VERSION = 1;


// ========== 新增可编辑逻辑 ==========

function isScenePositionMap(value) {
  return value &&
    typeof value === 'object' &&
    (value.serve || value.receive);
}

function normalizeScenePositions(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      serve: {},
      receive: {}
    };
  }

  // 新结构：{ serve: {}, receive: {} }
  if (isScenePositionMap(raw)) {
    return {
      serve: raw.serve || {},
      receive: raw.receive || {}
    };
  }

  // 兼容旧结构：{ "1": { "1": {x,y} } }
  // 旧变化站位默认迁移为“发球站位”
  return {
    serve: raw,
    receive: {}
  };
}

function loadCustomPositions() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_POSITIONS_KEY)) || {};
    gameState.customPositions = normalizeScenePositions(raw);
  } catch {
    gameState.customPositions = {
      serve: {},
      receive: {}
    };
  }
}

function saveCustomPositions() {
  localStorage.setItem(
    CUSTOM_POSITIONS_KEY,
    JSON.stringify(gameState.customPositions)
  );
}

// ========== 左侧自定义抽屉 ==========
function toggleDrawer(forceOpen) {
  const drawer = document.getElementById('side-drawer');
  if (!drawer) return;

  const shouldOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : !drawer.classList.contains('open');

  drawer.classList.toggle('open', shouldOpen);
}

function loadDrawerNote() {
  const note = document.getElementById('drawer-note');
  if (!note) return;

  note.value = localStorage.getItem(DRAWER_NOTE_KEY) || '';
}

function saveDrawerNote() {
  const note = document.getElementById('drawer-note');
  if (!note) return;

  localStorage.setItem(DRAWER_NOTE_KEY, note.value);
}

// 站位名的保存和读取
function loadFormationTitle() {
  const savedTitle = localStorage.getItem(FORMATION_TITLE_KEY);

  if (savedTitle) {
    gameState.formationTitle = savedTitle;
  }

  const input = document.getElementById('formation-title-input');
  if (input) {
    input.value = gameState.formationTitle;
  }
}

function saveFormationTitle() {
  const input = document.getElementById('formation-title-input');
  if (!input) return;

  const title = input.value.trim() || '未命名站位';
  gameState.formationTitle = title;
  localStorage.setItem(FORMATION_TITLE_KEY, title);
}

// ========== 自定义名字持久化（localStorage，刷新不丢） ==========
function loadCustomNames() {
  try {
    const raw = localStorage.getItem(CUSTOM_NAMES_KEY);
    if (raw) gameState.customNames = JSON.parse(raw) || {};
  } catch (e) { /* 忽略读取失败 */ }
}

function saveCustomNames() {
  try {
    localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(gameState.customNames));
  } catch (e) { /* 忽略写入失败 */ }
}

// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log('排球站位教学 - Web版已加载');
  loadCustomNames();
  loadCustomPositions();
  loadDrawerNote();
  loadFormationTitle();

  // 读取 hash，支持切换语言后停留在同一页面
  let initial = (location.hash || '').replace('#', '');
  if (!['index', 'tutorial', 'setter'].includes(initial)) {
    initial = 'index';
  }
  showPage(initial);
});

// ========== 页面切换函数 ==========

/**
 * 显示指定页面
 */
function showPage(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // 显示目标页面
  const targetPage = document.getElementById(pageName + '-page');
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageName;

    updateDrawerVisibility();
    updateTopActionsVisibility();
    // 如果是setter页面，初始化游戏
    if (pageName === 'setter') {
      initSetterPage();
    }
  }
}

function updateDrawerVisibility() {
  const drawer = document.getElementById('side-drawer');
  if (!drawer) return;

  const shouldShow = currentPage === 'setter';
  drawer.classList.toggle('drawer-visible', shouldShow);

  if (!shouldShow) {
    drawer.classList.remove('open');
  }
}

function updateTopActionsVisibility() {
  const actions = document.querySelector('.preset-actions');
  if (!actions) return;

  const shouldShow = currentPage === 'setter';
  actions.classList.toggle('actions-visible', shouldShow);

  if (!shouldShow) {
    closePresetMenu();
  }
}

function togglePresetMenu(event) {
  event.stopPropagation();

  const menu = document.getElementById('preset-menu');
  if (!menu) return;

  menu.classList.toggle('show');
}

function closePresetMenu() {
  const menu = document.getElementById('preset-menu');
  if (!menu) return;

  menu.classList.remove('show');
}

function handlePresetMenuAction(action) {
  closePresetMenu();

  if (action === 'import') {
    triggerImportPreset();
    return;
  }

  if (action === 'export') {
    exportPositionPreset();
  }
}

document.addEventListener('click', function (event) {
  const wrapper = document.querySelector('.preset-menu-wrapper');
  if (wrapper && wrapper.contains(event.target)) return;

  closePresetMenu();
});

/**
 * 跳转到站位主页面
 */
function goToSetter() {
  showPage('setter');
}

/**
 * 返回首页
 */
function goBack() {
  showPage('index');
}

// ========== 二传插上页面逻辑 ==========

/**
 * 初始化二传插上页面
 */
function initSetterPage() {
  console.log('初始化二传插上页面');

  // 重置状态 (但不重置 rotationOffset，保留用户的选择)
  gameState.currentRotation = 1;
  gameState.isAnimating = false;
  gameState.isOriginalPosition = true; // 初始显示原始站位

  // 初始化轮转状态
  initRotation();

  // 绘制球员
  renderPlayers();

  // 更新UI
  updateUI();

  // // 更新按钮文字
  // const toggleBtn = document.getElementById('toggle-position-btn');
  // if (toggleBtn) {
  //   toggleBtn.textContent = '变化 ➜';
  // }
}

/**
 * 获取逻辑轮次 (考虑偏移量)
 * 用户看到的 "第1轮" 可能对应逻辑上的 "第X轮"
 */
function getEffectiveRotation(displayRotation) {
  // 逻辑：(显示轮次 - 1 + 偏移量) % 6 + 1
  return ((displayRotation - 1 + gameState.rotationOffset) % TOTAL_ROTATIONS) + 1;
}

/**
 * 初始化轮转状态
 */
function initRotation() {
  const rotation = gameState.currentRotation;
  // 使用 effectiveRotation 获取实际的逻辑数据
  const effectiveRotation = getEffectiveRotation(rotation);

  const setterPos = getSetterPosition(effectiveRotation);
  const isFrontRow = isSetterInFrontRow(setterPos);
  // const needsPen = needsPenetration(setterPos);
  const statusText = getStatusText(effectiveRotation, setterPos, isFrontRow);
  const players = getAllPlayersPositions(effectiveRotation);

  gameState.setterPosition = setterPos;
  gameState.isSetterFrontRow = isFrontRow;
  // gameState.needsPenetration = needsPen;
  gameState.statusText = statusText;
  gameState.players = players;
  // gameState.originalSetterCoords = getPositionCoords(setterPos);

  // console.log('当前状态：', {
  //   displayRotation: rotation,
  //   effectiveRotation: effectiveRotation,
  //   setterPos,
  //   isFrontRow,
  //   needsPen
  // });
}

/**
 * 渲染球员到球场
 * (修改版：复用DOM元素以支持CSS动画)
 */
function renderPlayers() {
  const container = document.getElementById('players-container');
  if (!container) return;

  // 检查是否是首次渲染（容器为空）
  const isFirstRender = container.children.length === 0;

  gameState.players.forEach(player => {
    // 根据当前状态决定使用哪个坐标
    // let coords;
    // if (gameState.isOriginalPosition) {
    //   // 原始站位：使用标准位置坐标
    //   coords = getPositionCoords(player.position);
    // } else {
    //   // 实际接发球站位：使用计算后的坐标（含插上等）
    //   coords = player.coords;
    // }
    // 原始模式使用标准站位；变化模式优先使用自定义/编辑中的坐标
    const coords = getPlayerRenderCoords(player);

    // 尝试查找现有球员元素 (使用新的唯一 ID)
    let playerDiv = document.getElementById(player.id);

    // 如果元素不存在（页面首次加载），则创建
    let isNewElement = false;
    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.id = player.id; // 使用唯一 ID
      container.appendChild(playerDiv);
      isNewElement = true;
    }

    // 更新类名（处理颜色变化）
    playerDiv.className = `player ${player.role === 'setter' ? 'player-setter' : 'player-other'}`;

    // 如果是首次渲染或新元素，暂时禁用 transition 以避免从 (0,0) 飞过来的动画
    if (isFirstRender || isNewElement) {
      playerDiv.style.transition = 'none';
      playerDiv.style.left = coords.x + '%';
      playerDiv.style.top = coords.y + '%';

      // 强制重绘 (Reflow) 让 transition: none 生效
      void playerDiv.offsetWidth;

      // 恢复 transition (稍微延迟一点，或者在下一帧恢复，这里简单设为空字符串让CSS接管)
      // 使用 setTimeout 确保下一帧才恢复动画
      setTimeout(() => {
        playerDiv.style.transition = '';
      }, 50);
    } else {
      // 正常移动，使用 CSS transition
      playerDiv.style.transition = ''; // 确保使用 CSS 定义的 transition
      playerDiv.style.left = coords.x + '%';
      playerDiv.style.top = coords.y + '%';
    }

    // 更新内容（使用自定义名字，否则用默认名字）
    // nameKey：后排副攻被自由人替换，统一用 libero 身份；其余用各自身份
    const nameKey = player.nameKey || player.id;
    const defaultName = player.name;
    const displayName = gameState.customNames[nameKey] || defaultName;

    playerDiv.innerHTML = `
      <div class="player-content">
        <span class="player-number">${player.position}</span>
        <span class="player-role">${displayName}</span>
      </div>
    `;

    bindPlayerDrag(playerDiv, player);

    // 单击进入编辑模式（改成真实球员姓名，移动端单点即可）
    playerDiv.onclick = function (e) {
      if (gameState.isEditingPositions) return; // 拖动编辑时不触发改名
      e.stopPropagation();
      const roleSpan = playerDiv.querySelector('.player-role');
      if (!roleSpan || playerDiv.querySelector('.player-name-input')) return;

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 5;
      input.className = 'player-name-input';
      input.value = gameState.customNames[nameKey] || defaultName;

      roleSpan.replaceWith(input);
      input.focus();
      input.select();

      input.addEventListener('blur', function () {
        const newName = input.value.trim().slice(0, 5);
        if (newName) {
          gameState.customNames[nameKey] = newName;
        } else {
          delete gameState.customNames[nameKey];
        }
        saveCustomNames();
        const span = document.createElement('span');
        span.className = 'player-role';
        span.textContent = gameState.customNames[nameKey] || defaultName;
        input.replaceWith(span);
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') input.blur();
      });
    };
  });
}

/**
 * 更新UI显示
 */
function updateUI() {
  // 更新轮次显示
  const rotationDisplay = document.getElementById('rotation-display');
  if (rotationDisplay) {
    rotationDisplay.textContent = `第 ${gameState.currentRotation} 轮`;

    // ⚡️ 交互逻辑：如果是第1轮，允许点击设置起始位置
    if (gameState.currentRotation === 1 && !gameState.isAnimating) {
      rotationDisplay.classList.add('clickable');
      rotationDisplay.onclick = function () {
        showStartPosModal();
      };
      rotationDisplay.title = "点击设置二传起始位置";
    } else {
      rotationDisplay.classList.remove('clickable');
      rotationDisplay.onclick = null;
      rotationDisplay.title = "";
    }
  }

  // 更新发球图标和实际站位文字
  // const serveIndicator = document.getElementById('serve-indicator');
  updateSceneSwitchButtons();

  // 新增更新编辑按钮
  updatePositionActionButtons();

  // 更新按钮状态
  updateButtonStates();
}

function updateSceneSwitchButtons() {
  const serveBtn = document.getElementById('serve-scene-btn');
  const receiveBtn = document.getElementById('receive-scene-btn');
  const group = document.getElementById('scene-switch-group');

  if (!serveBtn || !receiveBtn || !group) return;

  const isServe = gameState.positionScene === 'serve';
  const isVariationMode = !gameState.isOriginalPosition;

  serveBtn.classList.toggle('active', isServe);
  receiveBtn.classList.toggle('active', !isServe);

  group.classList.toggle('variation-active', isVariationMode);
}

/**
 * 更新编辑按钮
 */
function updatePositionActionButtons() {
  const row = document.getElementById('position-action-row');
  const toggleBtn = document.getElementById('toggle-position-btn');
  const editBtn = document.getElementById('edit-position-btn');
  const court = document.getElementById('court');

  const isVariationMode = !gameState.isOriginalPosition;
  const isEditing = gameState.isEditingPositions;

  if (row) {
    row.classList.toggle('variation-mode', isVariationMode);
    row.classList.toggle('editing-mode', isEditing);
  }

  if (toggleBtn) {
    toggleBtn.textContent = isVariationMode ? '恢复原位 ←' : '变化 →';
  }

  if (editBtn) {
    editBtn.textContent = isEditing ? '保存' : '编辑';
  }

  if (court) {
    court.classList.toggle('variation', isVariationMode);
    court.classList.toggle('position-editing', isEditing);
  }
}

/**
 * 更新按钮状态
 */
function updateButtonStates() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const nextBtnText = document.getElementById('next-btn-text');

  if (prevBtn) {
    if (gameState.currentRotation === 1 || gameState.isAnimating) {
      prevBtn.classList.add('btn-disabled');
    } else {
      prevBtn.classList.remove('btn-disabled');
    }
  }

  if (nextBtn) {
    if (gameState.isAnimating) {
      nextBtn.classList.add('btn-disabled');
      if (nextBtnText) nextBtnText.textContent = '动画中...';
    } else {
      nextBtn.classList.remove('btn-disabled');
      if (nextBtnText) {
        nextBtnText.textContent = gameState.currentRotation === TOTAL_ROTATIONS ? '重新开始' : '下一轮 ▶';
      }
    }
  }
}

// ========== 轮转控制函数 ==========

/**
 * 下一轮
 */
function nextRotation() {
  if (gameState.isAnimating) {
    return;
  }

  gameState.isAnimating = true;
  updateButtonStates();

  let nextRot;
  if (gameState.currentRotation === TOTAL_ROTATIONS) {
    nextRot = 1;
  } else {
    nextRot = gameState.currentRotation + 1;
  }

  playRotationAnimation(nextRot);
}

/**
 * 上一轮
 */
function prevRotation() {
  if (gameState.isAnimating || gameState.currentRotation === 1) {
    return;
  }

  gameState.isAnimating = true;
  updateButtonStates();

  const prevRot = gameState.currentRotation - 1;
  playRotationAnimation(prevRot);
}

/**
 * 播放轮转动画（实际不再播放动画，直接跳转）
 */
function playRotationAnimation(nextRot) {
  const wasEditing = gameState.isEditingPositions;

  // 编辑模式下切换轮次：先保存当前编辑，然后回到基础模式
  if (wasEditing) {
    savePositionDraft();
    exitPositionEdit();

    gameState.isOriginalPosition = true;
    gameState.positionScene = 'serve';
  }

  // 非编辑模式下切换轮次：
  // 保持当前模式。
  // 如果原来在基础站位，就继续基础站位；
  // 如果原来在变化模式，就继续变化模式；
  // 如果原来是发球站位，就保持发球；
  // 如果原来是接发球站位，就保持接发球。
  gameState.isEditingPositions = false;
  gameState.draftPositions = {};

  // 更新轮次
  gameState.currentRotation = nextRot;

  // 计算新位置
  const effectiveRotation = getEffectiveRotation(nextRot);
  const newSetterPos = getSetterPosition(effectiveRotation);
  const newPlayers = getAllPlayersPositions(effectiveRotation);

  gameState.players = newPlayers;

  renderPlayers();
  afterRotation(effectiveRotation, newSetterPos);
}

/**
 * 轮转完成后的处理
 */
function afterRotation(rotation, setterPos) {
  // rotation 参数已经是 effectiveRotation
  const isFrontRow = isSetterInFrontRow(setterPos);
  // const needsPen = needsPenetration(setterPos);
  const statusText = getStatusText(rotation, setterPos, isFrontRow);

  gameState.setterPosition = setterPos;
  gameState.isSetterFrontRow = isFrontRow;
  // gameState.needsPenetration = needsPen;
  gameState.statusText = statusText;
  // gameState.originalSetterCoords = getPositionCoords(setterPos);

  // 直接结束，不播放插上动画
  gameState.isAnimating = false;

  // 更新UI (必须在 isAnimating = false 之后调用，否则第1轮的可点击状态无法激活)
  updateUI();
  updateButtonStates();
}

// ========== 开关控制函数 ==========

function getPositionSceneLabel(scene = gameState.positionScene) {
  return scene === 'receive' ? '接发球站位' : '发球站位';
}

function setPositionScene(scene) {
  if (!['serve', 'receive'].includes(scene)) return;

  if (gameState.isEditingPositions) {
    savePositionDraft();
    exitPositionEdit();
  }

  gameState.positionScene = scene;

  // 推荐：点击发球/接发球按钮时，如果当前是基础模式，自动进入变化模式
  // 这样用户点击按钮后能立即看到对应站位
  if (gameState.isOriginalPosition) {
    gameState.isOriginalPosition = false;
  }

  updateUI();
  renderPlayers();
}

/**
 * 切换原始站位/实际接发球站位
 */
function togglePosition() {
  if (gameState.isEditingPositions) {
    savePositionDraft();
    exitPositionEdit();
  }

  gameState.isOriginalPosition = !gameState.isOriginalPosition;

  // // 点击“变化”时默认进入发球站位
  // if (!gameState.isOriginalPosition) {
  //   gameState.positionScene = 'serve';
  // }

  updateUI();
  renderPlayers();
}

/**
 * 更新场地背景数字的位置
 */
function updateCourtLabels() {
  for (let i = 1; i <= TOTAL_ROTATIONS; i++) {
    const label = document.getElementById(`court-label-${i}`);
    if (label) {
      // 默认使用 POSITION_COORDS (原始位置)
      let coords = POSITION_COORDS[i];

      label.style.left = coords.x + '%';
      label.style.top = coords.y + '%';
    }
  }
}

// ========== 开轮设置模态框控制 ==========

let currentWheelPos = 1; // 当前滚轮选中的位置

function showStartPosModal() {
  const modal = document.getElementById('start-pos-modal');
  if (modal) {
    modal.classList.add('show');

    // 初始化滚轮位置
    initWheelPosition();
  }
}

function closeStartPosModal() {
  const modal = document.getElementById('start-pos-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// 初始化滚轮：滚动到当前 offset 对应的位置
function initWheelPosition() {
  // const SETTER_POSITIONS_REF = [1, 6, 5, 4, 3, 2]; //不再重复定义
  const currentStartPos = SETTER_POSITIONS[gameState.rotationOffset];

  const wheel = document.getElementById('pos-wheel');
  if (!wheel) return;

  const items = wheel.querySelectorAll('.wheel-item:not(.placeholder)');
  let targetIndex = 0;

  // 绑定点击事件：点击即滚动到该位置
  items.forEach((item, index) => {
    // 设置点击事件
    item.onclick = function () {
      wheel.scrollTo({
        top: index * 50, // 50px 是新高度
        behavior: 'smooth'
      });
    };

    if (parseInt(item.dataset.val) === currentStartPos) {
      targetIndex = index;
    }
  });

  // 滚动到该位置 (50px 是每项高度)
  // 使用 setTimeout 确保模态框渲染后再滚动，否则 scrollTop 可能无效
  setTimeout(() => {
    wheel.scrollTop = targetIndex * 50;
    checkWheelSelection(); // 手动触发一次高亮更新
  }, 100);
}

// 监听滚轮滚动，更新高亮
function checkWheelSelection() {
  const wheel = document.getElementById('pos-wheel');
  if (!wheel) return;

  const itemHeight = 50; // ⚡️ 更新为 50px
  // 计算当前滚动到了第几项 (四舍五入)
  const scrollIndex = Math.round(wheel.scrollTop / itemHeight);

  const items = wheel.querySelectorAll('.wheel-item:not(.placeholder)');

  items.forEach((item, index) => {
    if (index === scrollIndex) {
      item.classList.add('active');
      currentWheelPos = parseInt(item.dataset.val);
    } else {
      item.classList.remove('active');
    }
  });
}

// 确认选择
function confirmWheelSelection() {
  setStartingPosition(currentWheelPos);
}

/**
 * 设置二传起始位置
 * @param {number} pos - 用户选择的位置 (1-6)
 */
function setStartingPosition(pos) {
  // 计算 offset
  // SETTER_POSITIONS = [1, 6, 5, 4, 3, 2]
  // const SETTER_POSITIONS_REF = [1, 6, 5, 4, 3, 2];
  const newOffset = SETTER_POSITIONS.indexOf(pos);

  if (newOffset !== -1) {
    gameState.rotationOffset = newOffset;
    console.log(`设置二传起始位置为: ${pos}号位, Offset: ${newOffset}`);

    // 关闭模态框
    closeStartPosModal();

    // 重新初始化页面（刷新站位）
    initSetterPage();
  }
}

// 点击模态框背景关闭 (扩充原有的 window.onclick)
const originalWindowOnClick = window.onclick;
window.onclick = function (event) {
  if (originalWindowOnClick) originalWindowOnClick(event);

  const startModal = document.getElementById('start-pos-modal');
  if (event.target === startModal) {
    closeStartPosModal();
  }
}