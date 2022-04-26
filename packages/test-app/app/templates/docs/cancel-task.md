# `cancelTask`

**TL;DR - Call `cancelTask(obj, cancelId)` to cancel either a `runTask`, `scheduleTask`, or `throttleTask` invocation.**

The `cancelTask` function allows you to cancel an active `runTask`, `scheduleTask`, or `throttleTask` invocation. The `cancelId` is the value returned by the `runTask`, `scheduleTask`, or `throttleTask` invocation.

```js
import Component from 'ember-component';
import { runTask, cancelTask } from 'ember-lifeline';

export default Component.extend({
  start() {
     this._cancelId = runTask(this, () => {
       console.log('This runs after 5 seconds if this component is still displayed');
     }, 5000)
  },

  disable() {
    cancelTask(this, this._cancelId);
  },
 });
 ```
