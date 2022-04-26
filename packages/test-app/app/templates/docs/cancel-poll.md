# `cancelPoll`

**TL;DR - Call `cancelPoll(obj, token)` to a `pollTask` invocation.**

The `cancelPoll` function allows you to cancel an active `pollTask` invocation.

```js
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { pollTask, runTask } from 'ember-lifeline';

export default AutoRefreshComponent extends Component {
  @service api;

  enableAutoRefresh() {
    this._pollToken = pollTask(this, (next) => {
      this.get('api').request('get', 'some/path')
        .then(() => {
          runTask(this, next, 1800);
        });
    });
  },

  disableAutoRefresh() {
    cancelPoll(this, this._pollToken);
  },
}
```
