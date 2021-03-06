import * as React from 'react';
import { Provider } from 'react-redux';

import { wrapStore } from 'redux-in-worker';

import Counter from './Counter';
import Person from './Person';
import { initialState } from './store.worker';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: Function;
  }
}

const store = wrapStore(
  new Worker('./store.worker', { type: 'module' }),
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);

const App = () => (
  <React.StrictMode>
    <Provider store={store}>
      <Counter />
      <Person />
    </Provider>
  </React.StrictMode>
);

export default App;
