# Testing

Lifeline's entire purpose is to help ensure you've entangled and ultimately disposed of any outstanding async work in your applications. To help ensure this has occurred, and that you don't have any remaining queued async work, a test helper is provided which will assert that all async is disposed of.

To use the helper using the new ember-qunit module syntax:

```js
// test-helper.js
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { setupLifelineValidation } from 'ember-lifeline/test-support';

module('module', function(hooks) {
  setupLifelineValidation(hooks); // should be called before other setup functions
  setupTest(hooks);
  setupRenderingTest(hooks);

  test('test', function(assert) {
    ...
  })
})
```

If a failure occurs, lifeline will output an array containing the module names that were the cause of the async leakage.
