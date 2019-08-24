/* eslint no-plusplus: 0 */

import { createStore } from 'redux';
import Cache from "@wora/cache-persist";
import IDBStorage from '@wora/cache-persist/lib/idbstorage';

export const PATCH_TYPE_CREATE_OBJECT = 1;
export const PATCH_TYPE_DELETE_OBJECT = 2;
export const PATCH_TYPE_RETURN_STATE = 3;

let idCount = 0;
const idSet = new Set();
const idMap = new WeakMap();
const createPatches = (state) => {
  const patches = [];

  // better way to detect "DELETE_OBJECT"?
  const idSetToRemove = new Set(idSet);
  const markUsed = (baseObj) => {
    const pending = [baseObj];
    while (pending.length) {
      const obj = pending.pop();
      const id = idMap.get(obj);
      if (idSetToRemove.has(id)) {
        idSetToRemove.delete(id);
        Object.keys(obj).forEach((name) => {
          if (typeof obj[name] === 'object' && obj[name] !== null) {
            pending.push(obj[name]);
          }
        });
      }
    }
  };

  // is there a better way?
  const walk = (rootObj) => {
    const rootDest = {};
    const pending = [{ obj: rootObj, dest: rootDest }];
    while (pending.length) {
      const { obj, dest } = pending.pop();
      if (idMap.has(obj)) {
        markUsed(obj);
        dest.id = idMap.get(obj);
      } else {
        const id = ++idCount;
        dest.id = id;
        idMap.set(obj, id);
        idSet.add(id);
        const props = {};
        patches.unshift({
          type: PATCH_TYPE_CREATE_OBJECT,
          isArray: Array.isArray(obj),
          id,
          props,
        });
        Object.keys(obj).forEach((name) => {
          const value = obj[name];
          if (typeof value === 'object' && value !== null) {
            const prop = {};
            props[name] = prop;
            pending.push({ obj: value, dest: prop });
          } else {
            props[name] = value;
          }
        });
      }
    }
    return rootDest.id;
  };

  patches.push({
    type: PATCH_TYPE_RETURN_STATE,
    id: walk(state),
  });

  idSetToRemove.forEach((id) => {
    idSet.delete(id);
    patches.push({
      type: PATCH_TYPE_DELETE_OBJECT,
      id,
    });
  });

  return patches;
};



export const exposePersistStore = (exposeOptions) => {
  const idbStorages = IDBStorage.create({
    name: "redux-worker",
    storeNames: ["persist"]
  });
  const idb = {
    storage: idbStorages[0],
    serialize: false,
    ...persistOptions
  }
  
  const { reducer, preloadedState, enhancer, persistOptions = idb } = exposeOptions;
  exposeStore({ reducer, preloadedState, enhancer, persistOptions })
}

export const exposeStore = ({ reducer, preloadedState, enhancer, persistOptions = { disablePersist: true } }) => {

  const cache = new Cache(persistOptions);

  cache.restore().then(cache => {

    const initialState = Object.keys(cache.getState()).length ? cache.getState() : preloadedState;
    console.log("cache.getState()", cache.getState())
    const store = createStore(reducer, initialState, enhancer)

    self.onmessage = (e) => {
      const action = e.data;
      if (typeof action.type === 'string') {
        store.dispatch(action);
      }
    };
    const listener = () => {
      const state = store.getState();
      Object.keys(state).forEach(key => {
        cache.set(key, state[key]).catch(error => console.log("error", error))
      });

      const patches = createPatches(state);
      self.postMessage(patches);
    };
    store.subscribe(listener);
    listener();

  });




};
