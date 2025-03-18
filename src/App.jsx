import { createSignal, createEffect, createResource, onMount, onCleanup, batch } from 'solid-js';
import { createStore } from 'solid-js/store';

import styles from './App.module.css';

import {
    Canvas2D,
} from './canvas2d';

import {
    setups as staticSetups,
} from './setups';

import Sidebar from './sidebar';
import { UIConfig, UIConfigState } from './uiconfig';
import UIControlsRenderer from './uicontrols';

const INITIAL_NUM_NODES = 1;

const renderers = {
    'flat': Canvas2D,
}

function App() {
    const moduleId = 'Global';
    let RenderController;

    const [buttonStates, setButtonStates] = createSignal({
        running: false,
        links_weak: false,
        links_strong: true,
        background: false,
        emits: false,
        linking: true,
    });

    const [renderer, setRenderer] = createSignal('flat');
    const [currentSetup, setCurrentSetup] = createSignal();
    const [currentSetupStep, setCurrentSetupStep] = createSignal(0);

    const [controlsVisible, setControlsVisible] = createSignal(true);
    const [showLoadModal, setShowLoadModal] = createSignal(false);
    const [showSaveModal, setShowSaveModal] = createSignal(false);
    const [showPreviewModal, setShowPreviewModal] = createSignal(false);
    const [showSetupsModal, setShowSetupsModal] = createSignal(false);

    const [saveName, setSaveName] = createSignal('');
    const [currentContent, setCurrentContent] = createSignal('');
    const [ready, setReady] = createSignal();

    const [setups, setSetups] = createSignal(staticSetups);
    const [numNodes, setNumNodes] = createSignal(INITIAL_NUM_NODES);
    const [maxGroupLevels, setMaxGroupLevels] = createSignal(1);
    const [emitRate, setEmitRate] = createSignal(2);

    const [chunkState, setChunkState] = createSignal(null);
    const [chunks, setChunks] = createStore([]);
    const [isSidebarOpen, setIsSidebarOpen] = createSignal(false);

    const [el, setEl] = createSignal(null);

    const fetchSavedStateList = async (isReady) => {
      if (isReady) {
        return RenderController.getSavedStateList();
      }
    }
    const [savedStateList, {mutate, refetch}] = createResource(ready, fetchSavedStateList);

    const fetchChunkList = async () => {
      const d = await RenderController.getSavedChunkList();
      setChunks(d);

      return RenderController.getSavedChunkList();
    }
    const [chunkList, {mutate: mutateChunks, refetch: refetchChunks}] = createResource(isSidebarOpen, fetchChunkList);

    const sectionConfig = {
        numNodes: {
            label: 'Num Nodes',
            defaultValue: 1,
            range: {
                min: 0,
                max: 300
            },
            step: 1
        },
        maxGroupLevels: {
            label: 'Group Levels',
            defaultValue: 1,
            range: {
                min: 1,
                max: 6
            },
            step: 1
        },
        emitRate: {
            label: 'Emit Rate',
            defaultValue: 2,
            range: {
                min: 1,
                max: 20
            },
            step: 1
        },
        /*enabled: {
            defaultValue: true
        },
        name: {
            defaultValue: 'Default Name'
        }*/
    };

    const handleControlUpdate = (update) => {
        if (update.id == 'numNodes') {
            setNumNodes(update.value);
        }
        else if (update.id == 'maxGroupLevels') {
            setMaxGroupLevels(update.value);
        }
        else if (update.id == 'emitRate') {
            setEmitRate(update.value);
        }
    };

    onMount(() => {
        UIConfig.registerSection(moduleId, 'Base', sectionConfig);
        UIConfig.registerCallback(moduleId, handleControlUpdate);

        initRenderer(renderer());

        setReady(true);
        window.addEventListener('keydown', onKeyDown, true);
    });

    onCleanup(() => {
        RenderController?.reset();
        window.removeEventListener('keydown', onKeyDown);
        UIConfig.unregisterSection('Base');
    });

    const initRenderer = (rendererID) => {
        const RendererClass = renderers[rendererID];
        if (!RendererClass) {
          return;
        }

        if (RenderController) {
            handleButtonClick('stop');
            RenderController.control('reset');
            setBtnVal('running', false);

            while (el().firstChild) {
                el().lastChild.remove()
            }
        }

        RenderController = new RendererClass(el());
        setRenderer(rendererID);

        RenderController.init({
            INITIAL_NUM_NODES,
        });

        // FIXME
        RenderController.chunks = chunks;
        RenderController.chunkAdded = (chunkID) => {

          // expedient hack
          setIsSidebarOpen(false);
          setTimeout(() => {
              setIsSidebarOpen(true);
              refetchChunks();
          }, 100);
        }
    }

    createEffect(async () => {
        const setupDef = currentSetup();
        if (!setupDef) {
          return;
        }

        if (currentSetupStep() >= 0) {
            const setupStepDef = setupDef.steps[currentSetupStep()];

            const saveID = setupStepDef.saveID;
            if (saveID) {
               await RenderController.load(el(), saveID);
            }

            if (setupStepDef.config) {
                RenderController.control('config', setupStepDef.config);
            }

            updateUIState();

            if (setupStepDef.start) {
                RenderController.control('start');
                setBtnVal('running', true);
            }
        }
    });

    const onKeyDown = async (event) => {
        const eventKey = event.key.toLowerCase();
        if (eventKey === 'arrowleft') {
            toPrevStep();

            event.preventDefault();
            event.stopPropagation();
        }
        else if (eventKey === 'arrowright') {
            toNextStep();

            event.preventDefault();
            event.stopPropagation();
        }
    }

    function clearSetup() {
        setCurrentSetup(null);
        setCurrentSetupStep(null);

        handleButtonClick('stop');
        RenderController.control('reset');
        setBtnVal('running', false);
    }

    function toPrevStep() {
        if (hasPrevStep()) {
            setCurrentSetupStep((prev) => (prev - 1) % currentSetup().steps.length);
        }
    }

    function toNextStep() {
        if (hasNextStep()) {
            setCurrentSetupStep((prev) => (prev + 1) % currentSetup().steps.length);
        }
    }

    function hasNextStep() {
      const numSteps = currentSetup()?.steps?.length;
      if (numSteps > 0) {
          return currentSetupStep() < numSteps - 1;
      }

      return false
    }

    function hasPrevStep() {
      const numSteps = currentSetup()?.steps?.length;
      if (numSteps > 0) {
          return currentSetupStep() > 0;
      }

      return false
    }

    const nextSetupStep = (e) => {
        if (e.layerX < (e.target.offsetWidth / 2)) {
           toPrevStep();
        }
        else {
            toNextStep();
        }
    }

    function getStepTitle() {
        return currentSetup()?.steps[currentSetupStep()].title || '';
    }

    async function handleInitSetup(setupID) {
        setShowSetupsModal(false);
        setControlsVisible(false);

        batch(() => {
            setCurrentSetup(setups()[setupID]);
            setCurrentSetupStep(0);
        })
    }

    const handleDeleteSetup = (setupID) => {
        // expedient hack (not doing state correctly)
        setShowSetupsModal(false)
        setTimeout(() => {
            setShowSetupsModal(true);
        }, 100)
    }

    async function handleSave() {
        if (saveName()) {
            await RenderController.save(saveName());
        }

        refetch();
        setSaveName('');
        setShowSaveModal(false);
    }

    async function handleLoad(saveID) {
        await RenderController.load(el(), saveID);

        setBtnVal('running', false);

        updateUIState();
        setShowLoadModal(false);
    }

    function updateUIState() {
        setNumNodes(RenderController.NUM_NODES);
        setMaxGroupLevels(RenderController.MAX_GROUP_LEVELS);
        setEmitRate(parseInt(RenderController.EMIT_RATE * 100));

        setBtnVal('links_weak', RenderController.LINKS_WEAK_VISIBLE);
        setBtnVal('links_strong', RenderController.LINKS_STRONG_VISIBLE);
        setBtnVal('emits', RenderController.EMITS_VISIBLE);
        setBtnVal('background', RenderController.BACKGROUND_ENABLED);
    }

    const handleDeleteSave = (saveID) => {
        RenderController.deleteSavedState(saveID);

        // expedient hack (not doing state correctly)
        setShowLoadModal(false);
        setTimeout(() => {
            setShowLoadModal(true);
            refetch();
        }, 100)
    }

    const handleDeleteChunk = (chunkID) => {
        RenderController.deleteSavedChunk(chunkID);

        // expedient hack (not doing state correctly)
        setIsSidebarOpen(false);
        setTimeout(() => {
            setIsSidebarOpen(true);
            refetchChunks();
        }, 100);
    }

    createEffect(() => {
        RenderController.control('numNodes', numNodes());
    });

    createEffect(() => {
        RenderController.control('maxGroupLevels', maxGroupLevels());
    });

    createEffect(() => {
        RenderController.control('emitRate', emitRate());
    });

    const setBtnVal = (btn, val) => {
        setButtonStates(prev => ({
            ...prev,
            [btn]: val
        }));
    }

    const handleButtonClick = (btn) => {
        setButtonStates(prev => ({
            ...prev,
            [btn]: !prev[btn]
        }));

        if (btn == 'running') {
            if (buttonStates()[btn]) {
                RenderController.control('start');
            }
            else {
                RenderController.control('stop');
            }
        }
        else if (btn == 'links_weak') {
            if (buttonStates()[btn]) {
                RenderController.control('showWeakLinks');
            }
            else {
                RenderController.control('hideWeakLinks');
            }
        }
        else if (btn == 'links_strong') {
            if (buttonStates()[btn]) {
                RenderController.control('showStrongLinks');
            }
            else {
                RenderController.control('hideStrongLinks');
            }
        }
        else if (btn == 'add') {
            RenderController.control('addNodes', 10);
        }
        else if (btn == 'reset') {
            handleButtonClick('stop');
            RenderController.control('reset');
        }
        else if (btn == 'pulse') {
            RenderController.control('pulse', 1, 50);
        }
        else if (btn == 'background') {
            RenderController.control('toggleBackground');
        }
        else if (btn == 'emits') {
            RenderController.control('toggleEmits');
        }
        else if (btn == 'linking') {
            RenderController.control('toggleLinking');
        }
    }

    return (
      <div class="min-h-screen bg-white flex" id="container">
        <Show when={controlsVisible()}>
          <div class="flex w-full h-[64px] opacity-70 gap-15 flex-wrap z-10">
            <div class="flex flex-wrap gap-2 w-full p-2 bg-base-200">
              <div class="flex gap-2">
                <button
                  class={buttonStates().running ? styles.active : ''}
                  onClick={() => handleButtonClick('running')}
                  style={{width: '5em'}}
                >
                  {buttonStates().running ? 'Pause' : 'Start'}
                </button>
                <button
                  class={buttonStates().running ? styles.disabled : ''}
                  onClick={() => handleButtonClick('reset')}
                >
                  Reset
                </button>
                {/*<button
                  onClick={() => handleButtonClick('add')}
                >
                  Add 10
                </button>*/}
                {/*<button
                  onClick={() => handleButtonClick('pulse')}
                >
                  Pulse
                </button>*/}
              </div>
              <div class="flex gap-2">
                <button
                  class={buttonStates().emits ? styles.active : ''}
                  onClick={() => handleButtonClick('emits')}
                >
                  Emits
                </button>
                <button
                  class={buttonStates().links_weak ? styles.active : ''}
                  onClick={() => handleButtonClick('links_weak')}
                >
                  W-Links
                </button>
                <button
                  class={buttonStates().links_strong ? styles.active : ''}
                  onClick={() => handleButtonClick('links_strong')}
                >
                  S-Links
                </button>
                <button
                  class={buttonStates().linking ? styles.active : ''}
                  onClick={() => handleButtonClick('linking')}
                >
                  Linking
                </button>
                {/*<button
                  class={buttonStates().background ? styles.active : ''}
                  onClick={() => handleButtonClick('background')}
                >
                  Background
                </button>*/}
              </div>

              <UIControlsRenderer />

              <div class="flex gap-2">
                <button
                  class="btn btn-primary"
                  onClick={() => setShowLoadModal(true)}
                >
                  Load
                </button>
                <button
                  class="btn btn-primary"
                  onClick={() => setShowSaveModal(true)}
                >
                  Save
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  class="btn btn-primary"
                  onClick={() => setShowSetupsModal(true)}
                >
                  Load Setup
                </button>
                <button
                  class="btn btn-primary"
                  onClick={clearSetup}
                >
                  Clear Setup
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  class="btn btn-primary"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen())}
                >
                  {isSidebarOpen() ? 'Hide' : 'Show'} Chunks
                </button>
              </div>
              <Show when={Object.keys(renderers).length > 1}>
                <div class="flex gap-2">
                  <select class="select"
                    onchange={e => initRenderer(e.target.value)}
                    value={renderer()}
                  >
                    <For each={Object.entries(renderers)}>
                      {([rendererID, RendererClass]) => (
                        <option value={rendererID}>{rendererID}</option>
                      )}
                    </For>
                  </select>
                </div>
              </Show>

            </div>
          </div>
        </Show>

        <div class="absolute top-2 right-2 z-20">
          <Show when={!controlsVisible() && buttonStates().running}>
            <button
              class="btn btn-ghost btn-circle text-white hover:bg-white/20 mx-2 w-[3em]"
              onClick={(e) => setEmitRate(emitRate() + 5)}
            >
              +
            </button>
          </Show>

          <Show when={!controlsVisible()}>
            <button
              class="btn btn-ghost btn-circle text-white hover:bg-white/20 mx-2 w-[3em]"
              class={buttonStates().running ? styles.active : ''}
              onClick={() => handleButtonClick('running')}
            >
              {buttonStates().running ? '||' : '>'}
            </button>
          </Show>
          <button
            class="btn btn-ghost btn-circle text-white hover:bg-white/20 w-[3em]"
            onClick={() => setControlsVisible(!controlsVisible())}
          >
            <Show when={controlsVisible()} fallback='_'>
              X
            </Show>
          </button>
        </div>

        <div ref={setEl} style={{width: '100vw', height: '100vh', position: 'absolute', left: '0px'}} id="graph" />
        {/*<div style={{width: '400px', height: '400px', position: 'absolute', top: '150px', right: '0px'}} id="graph2" />*/}

        <Show when={showLoadModal()}>
          <div class="modal modal-open">
            <div class="modal-backdrop" onClick={() => setShowLoadModal(false)}/>
            <div class="modal-box">
              <h3 class="font-bold text-lg">Load</h3>
              <div class="py-4">
                <Show
                  when={savedStateList()?.length}
                  fallback={<p>Nothing saved</p>}
                >
                  <div class="menu bg-base-200 w-full rounded-box gap-2">
                    <For each={savedStateList()}>
                      {(saved) => (
                        <div class="flex gap-2">
                          <div
                            class="w-full flex row"
                            onClick={() => handleLoad(saved.id)}
                          >
                            <button
                              class="w-80 text-left"
                            >
                              {saved.id}
                            </button>
                            <img
                              class="w-20 text-right"
                              style={{cursor: 'pointer'}}
                              src={saved.thumbnail} style={{width: '70px'}}
                            />
                          </div>
                          <div>
                            <button
                              class="btn btn-error btn-sm"
                              onClick={() => handleDeleteSave(saved.id)}
                            >
                              X
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              <div class="modal-action">
                <button
                  class="btn"
                  onClick={() => setShowLoadModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showSetupsModal()}>
          <div class="modal modal-open">
            <div class="modal-backdrop" onClick={() => setShowSetupsModal(false)}/>
            <div class="modal-box">
              <h3 class="font-bold text-lg">Setups</h3>
              <div class="py-4">
                <Show
                  when={setups()}
                  fallback={<p>No setups saved</p>}
                >
                  <div class="menu bg-base-200 w-full rounded-box gap-2">
                    <For each={Object.values(setups())}>
                      {(setup) => (
                        <div class="flex gap-2">
                          <div
                            class="w-full flex row"
                            onClick={() => handleInitSetup(setup.id)}
                          >
                            <button
                              class="w-full text-left"
                            >
                              {setup.name}
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              <div class="modal-action">
                <button
                  class="btn"
                  onClick={() => setShowSetupsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showSaveModal()}>
          <div class="modal modal-open">
            <div class="modal-backdrop" onClick={() => setShowSaveModal(false)}/>
            <div class="modal-box">
              <h3 class="font-bold text-lg">Save</h3>
              <div class="py-4">
                <input
                  type="text"
                  placeholder="Enter save name"
                  class="input input-bordered w-full"
                  value={saveName()}
                  onInput={(e) => setSaveName(e.target.value)}
                />
              </div>
              <div class="modal-action">
                <button
                  class="btn btn-primary"
                  onClick={handleSave}
                  disabled={!saveName()}
                >
                  Save
                </button>
                <button
                  class="btn"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showPreviewModal()}>
          <div class="modal modal-open">
            <div class="modal-box">
              <h3 class="font-bold text-lg">Preview: name</h3>
              <div class="py-4">
                <img
                  src=""
                  alt="Preview"
                  class="w-full max-h-64 object-contain"
                />
              </div>
            </div>
          </div>
        </Show>

        <Show when={currentSetup()}>
          <div class="absolute bottom-10 left-0 right-0 flex justify-center items-center w-full">
            <div class="flex items-center bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 min-size-80 cursor-pointer" onClick={nextSetupStep}>
              <Show when={hasPrevStep()}>
                <button
                  class="btn btn-ghost btn-circle text-white hover:bg-white/20 rounded-full! pointer-events-none"
                >
                  &lt;
                </button>
              </Show>

              <h2 class="text-black text-3xl font-semibold select-none text-center w-full mx-10">
                {getStepTitle()}
              </h2>

              <Show when={hasNextStep()}>
                <button
                  class="btn btn-ghost btn-circle text-white hover:bg-white/20 rounded-full! pointer-events-none"
                >
                  &gt;
                </button>
              </Show>
            </div>
          </div>
        </Show>

        <Sidebar
          items={chunks}
          setItems={setChunks}
          stateChanged={setChunkState}
          isOpen={isSidebarOpen()}
          onClose={() => setIsSidebarOpen(false)}
          delete={handleDeleteChunk}
        />
      </div>
    );
}

export default App;