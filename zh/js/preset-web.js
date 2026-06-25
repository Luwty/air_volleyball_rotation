/**
 * preset-web.js
 * Web 平台的站位预设导入导出适配层。
 * 依赖 app.js 中的 gameState、保存函数、渲染函数。
 */
(function (global) {
    const PresetCore = global.AirVolleyPresetCore;

    function getCurrentPresetTitle() {
        const input = document.getElementById('formation-title-input');
        const title = input?.value?.trim() || gameState.formationTitle || '未命名站位';

        gameState.formationTitle = title;
        localStorage.setItem(FORMATION_TITLE_KEY, title);

        return title;
    }

    function getCurrentNote() {
        const note = document.getElementById('drawer-note');
        return note ? note.value : (localStorage.getItem(DRAWER_NOTE_KEY) || '');
    }

    function buildCurrentWebPreset() {
        return PresetCore.buildPreset({
            title: getCurrentPresetTitle(),

            totalRotations: TOTAL_ROTATIONS,
            setterPositions: SETTER_POSITIONS,

            customNames: gameState.customNames || {},
            variationPositions: gameState.customPositions || {},

            note: getCurrentNote()
        });
    }

    function exportPositionPreset() {
        if (gameState.isEditingPositions) {
            alert('请先保存正在编辑的站位，再导出');
            return;
        }

        const preset = buildCurrentWebPreset();

        const ok = window.confirm(
            `是否导出「${preset.title}」的站位设置？\n\n` +
            `导出内容包括：球员姓名、接发球变化站位、备注。`
        );

        if (!ok) return;

        const json = JSON.stringify(preset, null, 2);

        const blob = new Blob([json], {
            type: 'application/json;charset=utf-8'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `${PresetCore.sanitizeFileName(preset.title)}-气排球站位.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    function triggerImportPreset() {
        const input = document.getElementById('preset-file-input');
        if (!input) return;

        input.value = '';
        input.click();
    }

    function importPositionPreset(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const rawPreset = JSON.parse(reader.result);
                confirmAndApplyPositionPreset(rawPreset);
            } catch (error) {
                alert('导入失败：文件不是有效的 JSON 格式');
            }
        };

        reader.readAsText(file, 'utf-8');
    }

    function confirmAndApplyPositionPreset(rawPreset) {
        const result = PresetCore.validatePreset(rawPreset, {
            totalRotations: TOTAL_ROTATIONS
        });

        if (!result.ok) {
            alert(`导入失败：${result.message}`);
            return;
        }

        const preset = result.preset;

        const ok = window.confirm(
            `是否应用「${preset.title}」的站位设置？\n\n` +
            `将覆盖当前球员姓名、接发球变化站位和备注。\n` +
            `基础站位坐标不会被修改。`
        );

        if (!ok) return;

        applyPositionPreset(preset);
    }

    function applyPositionPreset(preset) {
        gameState.formationTitle = preset.title || '未命名站位';
        gameState.customNames = preset.customNames || {};
        gameState.customPositions = preset.variationPositions || {};
        gameState.draftPositions = {};
        gameState.isEditingPositions = false;

        localStorage.setItem(FORMATION_TITLE_KEY, gameState.formationTitle);
        localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(gameState.customNames));
        saveCustomPositions();

        if (typeof preset.note === 'string') {
            localStorage.setItem(DRAWER_NOTE_KEY, preset.note);

            const note = document.getElementById('drawer-note');
            if (note) {
                note.value = preset.note;
            }
        }

        const titleInput = document.getElementById('formation-title-input');
        if (titleInput) {
            titleInput.value = gameState.formationTitle;
        }

        initRotation();
        renderPlayers();
        updateUI();

        alert(`已应用「${gameState.formationTitle}」的站位设置`);
    }

    // 暴露给 HTML onclick 使用
    global.exportPositionPreset = exportPositionPreset;
    global.triggerImportPreset = triggerImportPreset;
    global.importPositionPreset = importPositionPreset;
})(window);