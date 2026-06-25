/**
 * preset-core.js
 * 气排球站位预设的纯数据逻辑。
 * 不依赖 DOM / localStorage / FileReader / Blob。
 * 未来微信小程序可以复用这一层。
 */
(function (global) {
    const SCHEMA = 'air-volleyball-position-preset';
    const VERSION = 1;

    function clone(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function normalizeTitle(title) {
        const value = String(title || '').trim();
        return value || '未命名站位';
    }

    function sanitizeFileName(name) {
        return normalizeTitle(name).replace(/[\\/:*?"<>|]/g, '_');
    }

    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeVariationPositions(value) {
        if (!isPlainObject(value)) {
            return {
                serve: {},
                receive: {}
            };
        }

        // 新结构：{ serve: {}, receive: {} }
        if (isPlainObject(value.serve) || isPlainObject(value.receive)) {
            return {
                serve: isPlainObject(value.serve) ? clone(value.serve) : {},
                receive: isPlainObject(value.receive) ? clone(value.receive) : {}
            };
        }

        // 旧结构：直接按轮次存储，默认作为发球站位
        return {
            serve: clone(value),
            receive: {}
        };
    }

    function normalizePreset(raw) {
        const preset = isPlainObject(raw) ? raw : {};

        return {
            schema: preset.schema,
            version: preset.version || 1,
            exportedAt: preset.exportedAt || '',

            title: normalizeTitle(preset.title),

            totalRotations: preset.totalRotations,
            setterPositions: Array.isArray(preset.setterPositions)
                ? preset.setterPositions.slice()
                : [],

            customNames: isPlainObject(preset.customNames)
                ? clone(preset.customNames)
                : {},

            // 新字段：variationPositions
            // 兼容旧字段：variationCoords
            variationPositions: normalizeVariationPositions(
                preset.variationPositions || preset.variationCoords
            ),

            note: typeof preset.note === 'string' ? preset.note : ''
        };
    }

    function buildPreset(options) {
        const source = options || {};

        return {
            schema: SCHEMA,
            version: VERSION,
            exportedAt: new Date().toISOString(),

            title: normalizeTitle(source.title),

            // 这两个字段只做校验，不用于覆盖基础坐标
            totalRotations: source.totalRotations,
            setterPositions: Array.isArray(source.setterPositions)
                ? source.setterPositions.slice()
                : [],

            // 只保存球员名和接发球变化站位
            customNames: clone(source.customNames),
            variationPositions: normalizeVariationPositions(source.variationPositions),

            // 可选备注
            note: String(source.note || '')
        };
    }

    function validatePreset(raw, expected) {
        const preset = normalizePreset(raw);
        const rules = expected || {};

        if (preset.schema !== SCHEMA) {
            return {
                ok: false,
                message: '文件类型不正确'
            };
        }

        if (rules.totalRotations && preset.totalRotations !== rules.totalRotations) {
            return {
                ok: false,
                message: `轮次数不匹配：当前项目是 ${rules.totalRotations} 轮`
            };
        }

        if (!isPlainObject(preset.customNames)) {
            return {
                ok: false,
                message: '球员姓名数据格式不正确'
            };
        }

        if (!isPlainObject(preset.variationPositions)) {
            return {
                ok: false,
                message: '变化站位数据格式不正确'
            };
        }

        return {
            ok: true,
            preset
        };
    }

    global.AirVolleyPresetCore = {
        SCHEMA,
        VERSION,
        buildPreset,
        normalizePreset,
        validatePreset,
        sanitizeFileName
    };
})(window);