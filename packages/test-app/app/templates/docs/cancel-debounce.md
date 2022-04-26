# `cancelDebounce`

**TL;DR - Call `cancelDebounce(obj, methodName)` to a `debounceTask` invocation.**

The `cancelDebounce` function allows you to cancel an active `debounceTask` invocation.

```js
import Component from '@glimmer/component';
import { debounceTask, cancelDebounce } from 'ember-lifeline';

export default LoggerComponent extends Component {
  logMe() {
    console.log('This will only run once every 300ms.');
  },

  click() {
    debounceTask(this, 'logMe', 300);
  },

  disable() {
    cancelDebounce(this, 'logMe');
  },
}
```
