import { EmberRunTimer } from '@ember/runloop/types';
export interface MapLike<K extends object, V> {
  delete(key: K): boolean;
  get(key: K): V;
  has(key: K): boolean;
  set(key: K, value: V): this;
}

export type Destroyable = Record<string, any>;

export type TaskOrName = Function | string;

export type Token = string | number;

export type Timer = EmberRunTimer | number;

export type EmberRunQueues =
  | 'sync'
  | 'actions'
  | 'routerTransitions'
  | 'render'
  | 'afterRender'
  | 'destroy';

export interface TestTimeoutWithTimeout {
  timeout: number;
  scaling?: never;
}
export interface TestTimeoutWithScaling {
  timeout?: never;
  scaling: number;
}
export type TestTimeoutOptions =
  | TestTimeoutWithTimeout
  | TestTimeoutWithScaling;
