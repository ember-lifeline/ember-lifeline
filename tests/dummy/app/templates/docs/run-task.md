# `runTask`

**TL;DR - Call `runTask(obj, fn, timeout)` on any object to schedule work.**

Use `runTask` where you might use `setTimeout`, `setInterval`, or
`Ember.run.later`.

`runTask` will handle three common issues with the above APIs.

First, _`setTimeout` and `setInterval` do not use the runloop_. Ember uses
a [work queuing mechanism called the runloop ](https://guides.emberjs.com/v2.5.0/applications/run-loop/).
In order for the queues to flush without autoruns (a feature that helps devs
be lazy in development but is disabled in tests and harms performance), a
runloop must be added around a callstack. For example:

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  init() {
    this._super(...arguments);

    window.setTimeout(() => {
      run(() => {
        this.set('date', new Date());
      });
    }, 500);
  },
});
```

There are [several ways to add runloops in the Ember API docs](http://emberjs.com/api/classes/Ember.run.html),
but regardless it is less than ideal to need to remember and reason about this.
Often `Ember.run.later` is used instead of `setTimeout`, for this reason. However
that still has issues.

Second, _none of `setTimeout`, `setInterval` or `Ember.run.later` bind the
timeout to the lifecycle of the context object_. If the example above is
re-written to use `Ember.run.later`...

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  init() {
    this._super(...arguments);

    run.later(() => {
      this.set('date', new Date());
    }, 500);
  },
});
```

**We're still making a dangerous assumption that this component instance
still exists 500ms from now**. In practice, especially with tests, objects
scheduling timers may be destroyed by the time the timer fires. This causes
a number of unexpected errors. To fix this, the codebase is littered
with checks for `isDestroyed` state on objects retained after destruction:

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  init() {
    this._super(...arguments);

    run.later(() => {
      // First, check if this object is even valid
      if (this.isDestroyed) {
        return;
      }
      this.set('date', new Date());
    }, 500);
  },
});
```

The code above is correct, but again, less than simple to write.
Instead, always use `runTask`. `runTask` entangles a timer with the
lifecycle of the object scheduling the work. When the object is destroyed,
the task is also cancelled.

Using `runTask`, the above can be written as:

```js
import Component from '@ember/component';
import { runTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  init() {
    this._super(...arguments);

    runTask(
      this,
      () => {
        this.set('date', new Date());
      },
      500
    );
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

Once you've ensured your object calls `runDisposables` in its `destroy` method, there's no need to worry about cancellation or the `isDestroyed` status of the object itself.

When importing and using lifeline's functions, **it's imperative that you additionally import and call `runDisposables` during your object's destroy method**. This ensures lifeline will correctly dispose of any remaining async work. Please see {{docs-link "the runDisposables section" "docs.run-disposables"}} for more information.
