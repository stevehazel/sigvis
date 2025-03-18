import { createStore } from 'solid-js/store';

const [UIConfigState, setUIConfigState] = createStore({
    sections: {}
});

const moduleCallbacks = new Map();

export const UIConfig = {
    registerSection(moduleId, sectionId, sectionConfig) {
        setUIConfigState('sections', sectionId, {
            moduleId,
            attributes: sectionConfig,
            values: Object.fromEntries(
                Object.entries(sectionConfig).map(([key, config]) => [key, config.defaultValue])
            )
        });
    },

    unregisterSection(sectionId) {
        setUIConfigState('sections', sectionId, undefined);
    },

    updateValue(sectionId, attributeId, value) {
        setUIConfigState('sections', sectionId, 'values', attributeId, value);
        
        const moduleId = UIConfigState.sections[sectionId]?.moduleId;
        if (moduleId && moduleCallbacks.has(moduleId)) {
            moduleCallbacks.get(moduleId)({
                sectionId,
                id: attributeId,
                value
            });
        }
    },

    registerCallback(moduleId, callback) {
        moduleCallbacks.set(moduleId, callback);
    }
};

export { UIConfigState };
