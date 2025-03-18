import { createSignal, For } from 'solid-js';
import { createStore } from 'solid-js/store';

function Sidebar(props) {
  const [sidebarState, setSidebarState] = createStore({
      selectedId: null
  });

  const handleSliderChange = (id, newValue) => {
      props.setItems(
          (item) => item.id === id,
          'value',
          parseInt(newValue)
      );
  };

  const toggleEnabled = (id) => {
      props.setItems(
          (item) => item.id === id,
          'enabled',
          (prev) => !prev
      );
  };

  const selectItem = (id) => {
      props.setItems(
          (item) => item,
          'selected',
          false
      );

      props.setItems(
          (item) => item.id === id,
          'selected',
          (prev) => {
            return true;
          }
      );

      setSidebarState('selectedId', id);
  };

  const handleDelete = (id) => {
      props.delete(id);
  }

  return (<>
    <div class={`fixed inset-y-0 right-0 w-40 bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out z-50 opacity-70
      ${props.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

      <div class="p-4 border-b cursor-pointer" onClick={props.onClose}>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold">Chunks</h2>
          <button 
            class="btn btn-ghost btn-sm" 
            onClick={props.onClose}
          >
            X
          </button>
        </div>
      </div>

      <div class="p-2 overflow-y-auto h-[calc(100%-4rem)]">
        <For each={props.items}>
          {(item) => (
            <div 
              class={`card mb-2 p-2 cursor-pointer transition-colors
                ${sidebarState.selectedId === item.id ? 'bg-black' : 'bg-base-200'}`}
              onClick={() => selectItem(item.id)}
            >
              <div class="flex gap-2 font-semibold">
                {item.id}
              </div>                
              <div class="flex items-center gap-2">
                <img 
                  src={item.thumbnail} 
                  alt={item.id} 
                  class="rounded object-contain"
                  style={{width: '90px', height: '60px'}}
                />
                <div>
                <button
                  class="btn btn-error btn-sm"
                  onClick={() => handleDelete(item.id)}
                >
                  X
                </button>
              </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  </>)
}

export default Sidebar;