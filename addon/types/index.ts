export interface IMap<K extends object, V> {
  delete(key: K): boolean;
  get(key: K): V;
  has(key: K): boolean;
  set(key: K, value: V): this;
}

export interface IDestroyable {
  isDestroyed: boolean;
  isDestroying: boolean;
  [key: string]: any;
}

export type TaskOrName = Function | string;

export type Timer = EmberRunTimer | number;

export interface EmberRunTimer {
  __ember_run_timer_brand__: any;
}

export type RunMethod<Target, Ret = any> =
  | ((this: Target, ...args: any[]) => Ret)
  | keyof Target;

export type EmberRunQueues =
  | 'sync'
  | 'actions'
  | 'routerTransitions'
  | 'render'
  | 'afterRender'
  | 'destroy';
