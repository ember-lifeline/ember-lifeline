# `throttleTask`

**TL;DR - Call `throttleTask(obj, methodName, args*, spacing, immediate)` on any object to throttle work.**

When a task is throttled, it is executed immediately. For the length of the
timeout, additional throttle calls are ignored. Again, like debounce, throttle
falls prey to many issues shared by `setTimeout`, though fewer since the
work itself is always run immediately. Regardless even just for
consistency the API of `throttleTask` is presented:

```js
import Component from '@ember/component';
import { throttleTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  click() {
    throttleTask(this, 'reportTime', 500);
  },

  reportTime() {
    this.set('time', new Date());
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

In this example, the first click will update `time`, but clicks after that
for 500ms will be disregarded. Then, the next click will fire and start
a timeout window of its own.

Often it is desired to pass additional arguments to the throttle task. We
also need to reference the same function in order for throttling to work. In
order to achieve this it is recommended to make use of instance variables. This
enables the throttle function to use the arguments in the state they are in
at the time the task is executed:

```js
import Component from '@ember/component';
import { throttleTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  click(evt) {
    this._evt = evt;
    throttleTask(this, 'updateClickedEl', 500);
  },

  updateClickedEl() {
    this.set('lastClickedEl', this._evt.target);
    this._evt = null;
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

When importing and using lifeline's functions, **it's imperative that you additionally import and call `runDisposables` during your object's destroy method**. This ensures lifeline will correctly dispose of any remaining async work. Please see {{docs-link "the runDisposables section" "docs.run-disposables"}} for more information.
