# `pollTask`

**TL;DR - Call `pollTask(obj, fn [, token])` on any object to setup polling.**

Use `pollTask` where you might reach for recursive `runTask(obj, fn, ms)`, `Ember.run.later`, `setTimeout`, and/or `setInterval`.

When using recursive `runTask` or `run.later` invocations causes tests to pause forever. This is due to the fact
that the Ember testing helpers automatically wait for all scheduled tasks in the run loop to finish before
resuming execution in the normal test context.

And as a reminder, _`setInterval` should never be used_. Say you `setInterval(fn, 20);`.
Regardless of how long `fn` takes, a new call will be scheduled every
20ms. For example if `fn` took 80ms to run (not uncommon), then _four_
new `fn` calls would be in the browser's event queue waiting to fire
immediately. This causes memory issues (the queue may never flush)
and performance problems. Instead, you should be scheduling new work
_after_ the previous work was done. For example:

```js
import Component from '@ember/component';
import { runTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  init() {
    this._super(...arguments);

    this.updateTime();
  },

  updateTime() {
    this.set('date', new Date());

    runTask(this, () => this.updateTime(), 20);
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

In this way the true delay between setting `date` is `20ms + time the rendering took`.

However, more work is still needed since when used in an acceptance test, the
snippet above will cause the test to never complete.

To avoid this testing "freezing" behavior, we would need to update the component
to have different behavior when testing than when running in normal development /
production. Typically, this is done something like:

```js
import Ember from 'ember';
import Component from '@ember/component';
import { runTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  init() {
    this._super(...arguments);

    this.updateTime();
  },

  updateTime() {
    this.set('date', new Date());

    if (!Ember.testing) {
      runTask(this, () => this.updateTime(), 20);
    }
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

Unfortunately, this makes it very difficult to actually test that the
polling is happening, and often times the polling behavior is itself
either fundamental to the objects purpose or difficult enough to warrant
its own tests.

This is where `pollTask` really shines. You could rewrite the above example to use `pollTask`
like this:

```js
import Component from '@ember/component';
import { inject } from '@ember/service';
import { runTask, pollTask, runDisposables } from 'ember-lifeline';

export const POLL_TOKEN = 'zee token';

export default Component.extend({
  time: inject(),

  init() {
    this._super(...arguments);

    pollTask(this, 'updateTime', POLL_TOKEN);
  },

  updateTime(next) {
    let time = this.get('time');

    this.set('date', time.now());

    runTask(this, next, 20);
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

In development and production, the `updateTime` method is executed initially during the components
`init` and then recursively called every 20ms after its processing finishes. When the component is
destroyed (e.g. no longer rendered on screen) any pending timers from `runTask` or `debounceTask`
calls are properly canceled (as usual with those methods).

If you want to stop polling at any time, you will need to call `cancelPoll`
instead of `runTask(this, next, delay)` - `cancelPoll` cleans up internal data
associated with the poll, avoiding a memory leak. You can also call `cancelPoll`
from outside the poll loop.

**NOTE**: Calls to `cancelPoll` do not cancel any nested `runTask` calls. You're required to cancel any
cancelable behaviors, including any calls to `runTask` using `cancelTask`.

In testing, the `updateTime` method would execute initially during the components instantiation (just like
in development and production environments), but would not automatically start polling. This allows
tests that are not related to the polling behavior to continue uninterrupted. To test the actual polling
functionality, import and use the provided `pollTaskFor` helper from `ember-lifeline/test-support`:

```js
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { pollTaskFor } from 'ember-lifeline/test-support';
import Service from '@ember/service';
import { POLL_TOKEN } from 'my-app/components/update-time';

let fakeNow;

module('updating-time', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register(
      'service:time',
      Service.extend({
        now() {
          return fakeNow;
        },
      })
    );
  }),
    test('updating-time updates', async function(assert) {
      fakeNow = new Date(2016);

      await render(hbs`
      {{#updating-time as |time|}}
        {{time}}
      {{/updating-time}}
    `);

      assert.dom(this.element).hasText(fakeNow);

      fakeNow = new Date(2017);
      // you can optionally provide a user defined token
      await pollTaskFor(POLL_TOKEN);

      assert.dom(this.element).hasText(fakeNow);
    });
});
```

Note: If nothing has been queued for the given token, calling `pollTaskFor(token)` will trigger an error.

When importing and using lifeline's functions, **it's imperative that you additionally import and call `runDisposables` during your object's destroy method**. This ensures lifeline will correctly dispose of any remaining async work. Please see {{docs-link "the runDisposables section" "docs.run-disposables"}} for more information.
