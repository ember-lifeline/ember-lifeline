declare module 'ember' {
  export namespace Ember {
    interface EmberRunTimer {
      __ember_run_timer_brand__: any;
    }
  }
}

type EmberRunQueues =
  | 'sync'
  | 'actions'
  | 'routerTransitions'
  | 'render'
  | 'afterRender'
  | 'destroy';
