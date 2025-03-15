import { createSignal, createEffect, createResource, onMount, onCleanup, batch } from 'solid-js';
import styles from './App.module.css';

import {
    Canvas2D,
} from './canvas2d';

import {
    setups as staticSetups,
} from './setups';


const INITIAL_NUM_NODES = 1;

function App() {
  let SS;

  const [buttonStates, setButtonStates] = createSignal({
      running: false,
      links_weak: false,
      links_strong: true,
      background: false,
      emits: false,
      linking: true,
  });

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
  const [el, setEl] = createSignal(null);

  const fetchSavedList = async (isReady) => {
    if (isReady) {
      return SS.getSavedList();
    }
  }
  const [savedList, {mutate, refetch}] = createResource(ready, fetchSavedList)

  onMount(() => {
      SS = new Canvas2D(el());
      SS.init({
          INITIAL_NUM_NODES,
      });

      setReady(true);
      window.addEventListener('keydown', onKeyDown, true);
  });

  onCleanup(() => {
      SS?.reset();
      window.removeEventListener('keydown', onKeyDown);
  });

  createEffect(async () => {
    const setupDef = currentSetup();
    if (!setupDef) {
      return;
    }

    if (currentSetupStep() >= 0) {
      const setupStepDef = setupDef.steps[currentSetupStep()];

      const saveID = setupStepDef.saveID;
      if (saveID) {
        await SS.load(el(), saveID);
      }

      if (setupStepDef.config) {
        SS.control('config', setupStepDef.config);
      }

      updateUIState();

      if (setupStepDef.start) {
        SS.control('start');
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
    SS.control('reset');
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

      // expedient hack
      setShowSetupsModal(false)
      setTimeout(() => {
        setShowSetupsModal(true);
      }, 100)
  }

  async function handleSave() {
      if (saveName()) {
          await SS.save(saveName());
      }

      refetch();
      setSaveName('');
      setShowSaveModal(false);
  }

  async function handleLoad(saveID) {
      await SS.load(el(), saveID);

      setBtnVal('running', false);

      updateUIState();
      setShowLoadModal(false);
  }

  function updateUIState() {
      setNumNodes(SS.NUM_NODES);
      setMaxGroupLevels(SS.MAX_GROUP_LEVELS);
      setEmitRate(parseInt(SS.EMIT_RATE * 100));
      
      setBtnVal('links_weak', SS.LINKS_WEAK_VISIBLE);
      setBtnVal('links_strong', SS.LINKS_STRONG_VISIBLE);
      setBtnVal('emits', SS.EMITS_VISIBLE);
      setBtnVal('background', SS.BACKGROUND_ENABLED);
  }

  const handleDelete = (saveID) => {
      SS.deleteSaved(saveID);

      // expedient hack
      setShowLoadModal(false);
      setTimeout(() => {
        setShowLoadModal(true);
        refetch();
      }, 100)
  }

  createEffect(() => {
      SS.control('numNodes', numNodes());
  });

  createEffect(() => {
      SS.control('maxGroupLevels', maxGroupLevels());
  });

  createEffect(() => {
      SS.control('emitRate', emitRate());
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
              SS.control('start');
          }
          else {
              SS.control('stop');
          }
      }
      else if (btn == 'links_weak') {
          if (buttonStates()[btn]) {
              SS.control('showWeakLinks');
          }
          else {
              SS.control('hideWeakLinks');
          }
      }
      else if (btn == 'links_strong') {
          if (buttonStates()[btn]) {
              SS.control('showStrongLinks');
          }
          else {
              SS.control('hideStrongLinks');
          }
      }
      else if (btn == 'add') {
          SS.control('addNodes', 10);
      }
      else if (btn == 'reset') {
          handleButtonClick('stop');
          SS.control('reset');
      }
      else if (btn == 'pulse') {
          SS.control('pulse', 1, 50);
      }
      else if (btn == 'background') {
          SS.control('toggleBackground');
      }
      else if (btn == 'emits') {
          SS.control('toggleEmits');
      }
      else if (btn == 'linking') {
          SS.control('toggleLinking');
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
              <button 
                onClick={() => handleButtonClick('pulse')}
              >
                Pulse
              </button>
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

            <div class="flex gap-2">
              <div class={styles.sliderGroup}>
                <div style={{'display': 'flex', 'flex-direction': 'column', 'gap': '0.05em',}}>
                  <div style={{'margin-top': '0em', 'font-size': '0.75em', width: '100%',}}>
                    <div style={{'display': 'flex', 'flex-direction': 'row', 'gap': '0.05em',}}>
                      <div style={{'align-content': 'center', 'white-space': 'nowrap'}}>
                        Num Nodes
                      </div>
                      <div style={{'margin-bottom': '-10px', 'text-align': 'center', 'font-size': '1rem', 'font-weight': 'bold', width: '50%', 'line-height': '1em',}}>
                        {numNodes()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <input 
                      type="range" 
                      min="1" 
                      max="100"
                      step="1"
                      value={numNodes()} 
                      onInput={(e) => setNumNodes(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div class={styles.sliderGroup}>
                <div style={{'display': 'flex', 'flex-direction': 'column', 'gap': '0.05em',}}>
                  <div style={{'margin-top': '0em', 'font-size': '0.75em', width: '100%',}}>
                    <div style={{'display': 'flex', 'flex-direction': 'row', 'gap': '0.05em',}}>
                      <div style={{'align-content': 'center', 'white-space': 'nowrap'}}>
                        Group Levels
                      </div>
                      <div style={{'margin-bottom': '-10px', 'text-align': 'center', 'font-size': '1rem', 'font-weight': 'bold', width: '50%', 'line-height': '1em',}}>
                        {maxGroupLevels()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={maxGroupLevels()} 
                      onInput={(e) => setMaxGroupLevels(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div class={styles.sliderGroup}>
                <div style={{'display': 'flex', 'flex-direction': 'column', 'gap': '0.05em',}}>
                  <div style={{'margin-top': '0em', 'font-size': '0.75em', width: '100%',}}>
                    <div style={{'display': 'flex', 'flex-direction': 'row', 'gap': '0.05em',}}>
                      <div style={{'align-content': 'center', 'white-space': 'nowrap'}}>
                        Emit Rate
                      </div>
                      <div style={{'margin-bottom': '-10px', 'text-align': 'center', 'font-size': '1rem', 'font-weight': 'bold', width: '50%', 'line-height': '1em',}}>
                        {emitRate()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={emitRate()} 
                      onInput={(e) => setEmitRate(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

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
                when={savedList()?.length}
                fallback={<p>Nothing saved</p>}
              >
                <div class="menu bg-base-200 w-full rounded-box gap-2">
                  <For each={savedList()}>
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
                            onClick={() => handleDelete(saved.id)}
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
    </div>
    )

  return (
    <div class={styles.app}>

    </div>
  );
}

export default App;