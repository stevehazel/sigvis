import { For, Match, Switch } from 'solid-js';
import { UIConfigState, UIConfig } from './uiconfig';

import styles from './App.module.css';

function UIControlsRenderer() {
  return (
    <For each={Object.entries(UIConfigState.sections)}>
      {([sectionId, section]) => (
        <div class="section" class="flex gap-2">
          {/*<h2>{sectionId}</h2>*/}
          <For each={Object.entries(section.attributes)}>
            {([attrId, config]) => (
              <div class="control">
                <Switch>
                  <Match when={typeof config.defaultValue === 'boolean'}>
                    <label>{config.label || attrId}</label>
                    <input
                      type="checkbox"
                      checked={section.values[attrId]}
                      onChange={(e) => UIConfig.updateValue(sectionId, attrId, e.target.checked)}
                    />
                  </Match>
                  <Match when={config.range}>
                    <div class={styles.sliderGroup}>
                      <div style={{'display': 'flex', 'flex-direction': 'column', 'gap': '0.05em',}}>
                        <div style={{'margin-top': '0em', 'font-size': '0.75em', width: '100%',}}>
                          <div style={{'display': 'flex', 'flex-direction': 'row', 'gap': '0.05em',}}>
                            <div style={{'align-content': 'center', 'white-space': 'nowrap'}}>
                              {section.attributes[attrId].label}
                            </div>
                            <div style={{'margin-bottom': '-10px', 'text-align': 'center', 'font-size': '1rem', 'font-weight': 'bold', width: '50%', 'line-height': '1em',}}>
                              {section.values[attrId]}
                            </div>
                          </div>
                        </div>
                        <div>
                          <input 
                            type="range"
                            min={config.range.min}
                            max={config.range.max}
                            step={config.step || 1}
                            value={section.values[attrId]}
                            onInput={(e) => UIConfig.updateValue(sectionId, attrId, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </Match>
                  <Match when={true}>
                    <label>{config.label || attrId}</label>
                    <input
                      type="text"
                      value={section.values[attrId]}
                      onInput={(e) => UIConfig.updateValue(sectionId, attrId, e.target.value)}
                    />
                  </Match>
                </Switch>
              </div>
            )}
          </For>
        </div>
      )}
    </For>
  );
}

export default UIControlsRenderer;