/**
 * rotation.js
 * 排球轮转逻辑工具函数（Web版）
 * 从小程序版本移植，保持逻辑不变
 */

/**
 * 二传在6个轮次中的位置（反轮模式）
 * 第1轮: 1号位，第2轮: 6号位，第3轮: 5号位
 * 第4轮: 4号位，第5轮: 3号位，第6轮: 2号位
 */
const SETTER_POSITIONS = [1, 5, 4, 3, 2];
const TOTAL_ROTATIONS = SETTER_POSITIONS.length;


/**
 * 6个位置的坐标配置（百分比，相对于球场容器）
 * 排球场位置编号（俯视图）：
 *   球网 (18%)
 *   4  3  2  (前排 25-28%)
 *   三米线 (40%)
 *   5  6  1  (后排 72-78%)
 */
const POSITION_COORDS = {
  1: { x: 66.7, y: 74 },     // 右后角（1号位，发球位）
  2: { x: 83.3, y: 26 },     // 右前角（2号位）
  3: { x: 50, y: 26 },       // 中前（3号位）
  4: { x: 16.7, y: 26 },     // 左前角（4号位）
  5: { x: 33.3, y: 74 },     // 左后角（5号位）
};

/**
 * 实际接发球站位坐标配置（每一轮的特殊站位）
 * 格式：Rotation (轮次) -> Position (位置号) -> {x, y}
 * 现在修改为拖动编辑模式
 */
const ACTUAL_POSITIONS = {
  1: { ...POSITION_COORDS },
  2: { ...POSITION_COORDS },
  3: { ...POSITION_COORDS },
  4: { ...POSITION_COORDS },
  5: { ...POSITION_COORDS }
};

/**
 * 获取指定轮次的二传位置
 * @param {number} rotation - 轮次 (1-6)
 * @returns {number} 二传所在位置 (1-6)
 */
function getSetterPosition(rotation) {
  if (rotation < 1 || rotation > TOTAL_ROTATIONS) {
    throw new Error('轮次必须在1-5之间');
  }
  return SETTER_POSITIONS[rotation - 1];
}

/**
 * 判断二传是否在前排
 * 前排位置：2、3、4
 * 后排位置：1、5、6
 * @param {number} position - 位置 (1-6)
 * @returns {boolean} 是否在前排
 */
function isSetterInFrontRow(position) {
  return [2, 3, 4].includes(position);
}

/**
 * 获取位置坐标（百分比）
 * @param {number} position - 位置 (1-6)
 * @returns {object} 坐标对象 {x, y}（百分比）
 */
function getPositionCoords(position) {
  return POSITION_COORDS[position];
}

/**
 * 轮转到下一个轮次
 * @param {number} currentRotation - 当前轮次 (1-6)
 * @returns {number} 下一个轮次 (1-6)
 */
function nextRotation(currentRotation) {
  return currentRotation === TOTAL_ROTATIONS ? 1 : currentRotation + 1;
}

/**
 * 轮转到上一个轮次
 * @param {number} currentRotation - 当前轮次 (1-6)
 * @returns {number} 上一个轮次 (1-6)
 */
function prevRotation(currentRotation) {
  return currentRotation === 1 ? 6 : currentRotation - 1;
}

/**
 * 获取当前状态的提示文字
 * @param {number} rotation - 当前轮次
 * @param {number} position - 二传位置
 * @param {boolean} isFrontRow - 是否在前排
 * @returns {string} 提示文字
 */
function getStatusText(rotation, position, isFrontRow) {
  if (isFrontRow) {
    if (position === 2) {
      return `第${rotation}轮：二传在前排${position}号位，理想传球位置，不需要插上`;
    } else {
      return `第${rotation}轮：二传在前排${position}号位，位置稍偏，但不需要插上`;
    }
  } else {
    return `第${rotation}轮：二传在后排${position}号位`;
  }
}

/**
 * 获取所有球员的初始位置（根据第1轮反轮配置）
 * @param {number} rotation - 当前轮次
 * @returns {array} 球员位置数组
 */
function getAllPlayersPositions(rotation) {
  const setterPos = getSetterPosition(rotation);

  // 第1轮的基础配置（图片中的布局）：
  // 1号位：二传，2号位：主攻，3号位：副攻
  // 4号位：接应，5号位：主攻，6号位：副攻(自)
  const baseRoles = {
    1: '二传',
    2: '攻手A',
    3: '自由人',
    4: '接应',
    5: '攻手B',
  };

  const players = [];
  const FRONT_POSITIONS = [2, 3, 4];
  const ATTACKER_BASE_POSITIONS = [2, 5]; // 2=攻手A，5=攻手B

  function getBasePosAtCourtPos(pos) {
    return ((pos - 1 + (rotation - 1)) % 5) + 1;
  }

  function getHighlightedAttackerBasePos() {
    const frontAttackers = FRONT_POSITIONS
      .map(pos => getBasePosAtCourtPos(pos))
      .filter(basePos => ATTACKER_BASE_POSITIONS.includes(basePos));

    // 五人轮转特殊轮次：攻手A、攻手B都在前排时，只高亮攻手A
    if (frontAttackers.includes(2)) return 2;

    return frontAttackers[0] || null;
  }

  const highlightedAttackerBasePos = getHighlightedAttackerBasePos();

  // 注释懒得改,现在是气排球规则,下面的注释都是旧的
  // 根据轮转计算当前轮次每个位置的角色
  // 轮转规则：每次顺时针轮转（位置号减1，1->6循环）
  for (let pos = 1; pos <= 5; pos++) {
    // 计算这个位置在第1轮时是哪个位置 (basePos)
    // 比如：当前 pos=1 (后排右), rotation=2, 则 basePos = (1-1 + 2-1)%6 + 1 = 2 (原来是2号位的人转到了1号位)
    const basePos = getBasePosAtCourtPos(pos);

    let roleName = baseRoles[basePos];

    // 这个应该是换人导致的,气排球暂时没有换人选项,故直接注释
    // ⚡️ 特殊规则：副攻(3号位起始) 和 接应/副攻(6号位起始) 在后排时变身为“自由”
    // 注意：这里的 basePos 3 和 6 代表的是那两名球员的"身份ID"
    // pos 代表的是他们现在站的"位置ID"

    // 规则1: 起始在6号位的球员 (basePos === 6)
    // if (basePos === 5) {
    //   if ([1, 5].includes(pos)) {
    //     roleName = '自由'; // 后排叫自由
    //   } else {
    //     roleName = '二副'; // 前排叫二副
    //   }
    // }

    // // 规则2: 起始在3号位的球员 (basePos === 3)
    // if (basePos === 3) {
    //   if ([1, 5].includes(pos)) {
    //     roleName = '自由'; // 后排叫自由
    //   } else {
    //     roleName = '一副'; // 前排叫一副
    //   }
    // }

    const isSetterPos = (pos === setterPos);

    // ⚡️ 颜色规则调整：
    // 1. 二传：不再特殊高亮，改用普通颜色 (gray)
    // 2. 主攻：在前排时高亮 (yellow)，后排时普通 (gray)
    // 3. 其他：普通颜色 (gray)

    // let isHighlight = false;

    // // 如果角色是"主攻" (basePos 2 或 5) 且 在前排 (2,3,4号位) -> 高亮
    // if ((basePos === 2 || basePos === 4) && [2, 3, 4].includes(pos)) {
    //   isHighlight = true;
    // }

    const isHighlight = FRONT_POSITIONS.includes(pos) && basePos === highlightedAttackerBasePos;

    // 获取实际站位坐标（如果配置了ACTUAL_POSITIONS，否则使用标准坐标）
    let actualCoords = POSITION_COORDS[pos];
    if (ACTUAL_POSITIONS[rotation] && ACTUAL_POSITIONS[rotation][pos]) {
      actualCoords = ACTUAL_POSITIONS[rotation][pos];
    }

    // 名字键：后排副攻(3/6号身份)被自由人替换，统一用 libero 身份共享名字
    let nameKey = `player-base-${basePos}`;
    if ((basePos === 3) && [1, 5].includes(pos)) {
      nameKey = 'libero';
    }

    players.push({
      // ⚡️ 确保添加 id 字段
      id: `player-base-${basePos}`,
      nameKey: nameKey,
      position: pos,
      role: isHighlight ? 'setter' : 'other',
      name: roleName,
      color: isHighlight ? '#FFD54F' : '#BDBDBD',
      coords: actualCoords
    });
  }

  return players;
}
