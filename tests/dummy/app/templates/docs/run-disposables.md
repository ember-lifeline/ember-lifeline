# `runDisposables`

When importing and using lifeline's functions, it's _imperative_ that you additionally import and call `runDisposables` during your object's `destroy` method. This ensures lifeline will correctly dispose of any remaining async work.

```js
import Component from '@ember/component';
import { runTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  // use `runTask` method somewhere in this component

  willDestroy() {
    this._super(...arguments);

    runDisposables(this); // ensure that lifeline will clean up any remaining async work
  },
});
```
