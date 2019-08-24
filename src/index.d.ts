import { Store, Action, AnyAction } from 'redux';
import { CacheOptions } from '@wora/cache-persist';

export type WrapStore = <S, A extends Action = AnyAction>(
  worker: Worker,
  initialState: S,
  enhancer?: Function,
) => Store<S, A>;

export type ExposeStore = <S>( exposeOptions : {
  reducer?: any,
  initialState?: S,
  enhancer?: Function,
  persistOptions?: CacheOptions
}) => void;

export const wrapStore: WrapStore;
export const exposeStore: ExposeStore;
export const exposePersistStore: ExposeStore;