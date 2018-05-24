declare module 'ember' {
  export namespace Ember {
    const WeakMap: WeakMapConstructor;

    interface EmberRunTimer {
      __ember_run_timer_brand__: any;
    }
  }
}