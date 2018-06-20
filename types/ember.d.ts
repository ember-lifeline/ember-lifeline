interface EmberRunTimer {
  __ember_run_timer_brand__: any;
}

type RunMethod<Target, Ret = any> =
  | ((this: Target, ...args: any[]) => Ret)
  | keyof Target;

type EmberRunQueues =
  | 'sync'
  | 'actions'
  | 'routerTransitions'
  | 'render'
  | 'afterRender'
  | 'destroy';
