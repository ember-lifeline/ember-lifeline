export interface IMap<K extends object, V> {
  delete(key: K): boolean;
  get(key: K): V;
  has(key: K): boolean;
  set(key: K, value: V): this;
}

export interface IDisposable {
  isDestroyed: boolean;
  isDestroying: boolean;
}

export type TaskOrName = Function | string;
