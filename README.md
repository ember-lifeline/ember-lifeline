# ember-lifeline

[![Build Status](https://travis-ci.org/ember-lifeline/ember-lifeline.svg?branch=master)](https://travis-ci.org/ember-lifeline/ember-lifeline)
[![Ember Observer Score](https://emberobserver.com/badges/ember-lifeline.svg)](https://emberobserver.com/addons/ember-lifeline)
[![npm version](https://badge.fury.io/js/ember-lifeline.svg)](https://badge.fury.io/js/ember-lifeline)
[![Monthly Downloads from NPM](https://img.shields.io/npm/dm/ember-lifeline.svg?style=flat-square)](https://www.npmjs.com/package/ember-lifeline)
[![Code Style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](#badge)

Ember applications have long life-cycles. A user may navigate to several pages
and use many different features before they leave the application. This
makes JavaScript and Ember development unlike Rails development, where the
lifecycle of a request is short and the environment disposed of after
each request. It makes Ember development much more like iOS or video game
development than traditional server-side web development.

It is good to note that this isn't something inherent to just Ember. Any
single-page app framework or solution (Angular, React, Vue, Backbone...)
must deal with this lifecycle of objects, and specifically with how async
tasks can be entangled with a lifecycle.

There is a fantastic Ember addon, [ember-concurrency](http://ember-concurrency.com/)
that solves these problems in a very exciting and simple way. It is largely
inspired by [RxJS](http://reactivex.io/) and the Observable pattern, both of
which concern themselves with creating life-cycle-free
async that, in practice, tend to be hard for developers to learn.

This addon introduces several functional utility methods to help manage async, object
lifecycles, and the Ember runloop. These tools should provide a simple developer
experience that allows engineers to focus on the business domain, and think less
about the weird parts of working in a long-lived app.

## Installation

    ember install ember-lifeline

## Usage

Ember Lifeline supports a functional API that enables entanglement - _the association of async behavior to object instances_. This allows you to write async code in your classes that can be automatically cleaned up for you when the object is destroyed.

The API is divided into two main parts:

- Run loop entanglement
- DOM event handler entanglement

Additionally, lifeline exposes a primative, `disposables`, that allows you to entangle functionality of your choosing.

:warning: When importing and using lifeline's functions, it's imperative that you additionally import and call `runDisposables` during your object's `destroy` method. This ensures lifeline will correctly dispose of any remaining async work.

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

Lifeline provides [mixins](#mixins) that conveniently implement `destroy`, correctly calling `runDisposables`.

Lifeline also exposes a QUnit test helper to ensure you've correctly implemented `runDisposables` within your objects. Please see the [Testing](#testing) section below.

### Run loop entanglement via `*Task` functions

### `runTask`

**tl;dr Call `runTask(obj, fn, timeout)` on any object to schedule work.**

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

### `scheduleTask`

**tl;dr Call `scheduleTask(obj, queueName, fnOrMethodName, args*)` on any object to schedule work on the run loop.**

Use `scheduleTask` where you might use `Ember.run.schedule`.

Like `runTask`, `scheduleTask` avoids common pitfalls of deferred work.

_`Ember.run.schedule` does not bind the scheduled work to the lifecycle of the context object_.

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  init() {
    this._super(...arguments);

    run.schedule('actions', this, () => {
      this.set('date', new Date());
    });
  },
});
```

There's a chance that objects scheduling work may be destroyed by the time the
queue is flushed. Leaving behavior to chance invites flakiness. This manifests
as a number of unexpected errors. Fixing this issue requires checks for
`isDestroyed` state on objects retained after destruction:

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  init() {
    this._super(...arguments);

    run.schedule('actions', this, () => {
      // First, check if this object is even valid
      if (this.isDestroyed) {
        return;
      }
      this.set('date', new Date());
    });
  },
});
```

The code above is correct, but less than ideal. Instead, always use
`scheduleTask`. `scheduleTask` entangles a scheduled task with the lifecycle of
the object scheduling the work. When the object is destroyed, the task is also
cancelled.

Using `scheduleTask`, the above can be written as:

```js
import Component from '@ember/component';
import { scheduleTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  init() {
    this._super(...arguments);

    scheduleTask(this, 'actions', () => {
      this.set('date', new Date());
    });
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
```

#### A word about the `afterRender` queue

Scheduling work on the `afterRender` queue has well known, negative performance implications.
Therefore, _`scheduleTask` is prohibited from scheduling work on the `afterRender` queue._

### `debounceTask`

**tl;dr Call `debounceTask(obj, methodName, args*, wait, immediate)` on any object to debounce work.**

Debouncing is a common async pattern often used to manage user input. When a
task is debounced with a timeout of 100ms, it first schedules the work for
100ms later. Then if the same task is debounced again with (again) a timeout
of 100ms, the first timer is cancelled and a new one made for 100ms after
the second debounce request. If no request to debounce that task is made
for 100ms, the task executes.

Here is a good blog post about debounce and throttle patterns:
[jQuery throttle / debounce: Sometimes, less is more!](http://benalman.com/projects/jquery-throttle-debounce-plugin/)

Debouncing is a pattern for managing scheduled work over time, and so it
falls prey to some of the same faults as `setTimeout`. Again Ember provides
`Ember.run.debounce` to handle the runloop aspect, but does not provide
a simple solution for cancelling work when the object is destroyed.

Enter `debounceTask`. For example, no matter how quickly you click on this
component, it will only report the time if you have stopped clicking
for 500ms:

```js
import Component from '@ember/component';
import { debounceTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  click() {
    debounceTask(this, 'reportTime', 500);
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

However if the component is destroyed, any pending debounce task will be
cancelled.

### `throttleTask`

**tl;dr Call `throttleTask(obj, methodName, args*, spacing, immediate)` on any object to throttle work.**

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

### `pollTask`

**tl;dr call `pollTask(obj, fn [, token])` on any object to setup polling.**

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

export default Component.extend({
  time: inject(),

  init() {
    this._super(...arguments);

    // you can optionally provide a user defined token as a third argument
    this._pollToken = pollTask(this, 'updateTime');
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

In testing, the `updateTime` method would execute initially during the components instantiation (just like
in development and production environments), but would not automatically start polling. This allows
tests that are not related to the polling behavior to continue uninterrupted. To test the actual polling
functionality, use the provided `pollTaskFor` helper:

```js
import moduleForComponent from 'ember-qunit';
import wait from 'ember-test-helpers/wait';
import { pollTaskFor } from 'ember-lifeline';
import Service from '@ember/service';

let fakeNow;
moduleForComponent('updating-time', {
  integration: true,

  beforeEach() {
    this.register(
      'service:time',
      Service.extend({
        now() {
          return fakeNow;
        },
      })
    );
  },
});

test('updating-time updates', function(assert) {
  fakeNow = new Date(2016);

  this.render(hbs`
    {{#updating-time as |time|}}
      {{time}}
    {{/updating-time}}
  `);

  assert.equal(
    this.$()
      .text()
      .trim(),
    fakeNow
  );

  return wait()
    .then(() => {
      fakeNow = new Date(2017);
      // you can optionally provide a user defined token
      pollTaskFor(this._pollToken);

      return wait();
    })
    .then(() => {
      assert.equal(
        this.$()
          .text()
          .trim(),
        fakeNow
      );
    });
});
```

Note: If nothing has been queued for the given token, calling `pollTaskFor(token)` will trigger an error.

### `registerDisposable`

**tl;dr call `registerDisposable(obj, fn)` on any object to register a function you want to run when the object is destroying.**

Use `registerDisposable` as a replacement for explictly disposing of any externally managed resources. A disposable is a function that disposes of resources that are outside of Ember's lifecyle. This essentially means you can register a function that you want to run to automatically tear down any resources when the Ember object is destroyed.

Example:

It's common to see code written to explicitly unbind event handlers from external libraries.

```js
// app/components/foo-bar.js
import Component from '@ember/component';
import { run } from '@ember/runloop';
import DOMish from 'some-external-library';

export default Component.extend({
  init() {
    this._super(...arguments);

    this.DOMish = new DOMish();

    this.bindEvents();
  },

  destroy() {
    this._super(...arguments);

    this.unbindEvents();
  },

  bindEvents() {
    this.DOMish.on('foo', run.bind(this.respondToDomEvent));
  },

  unbindEvents() {
    this.DOMish.off('foo');
  }

  respondToDOMEvent() {
    // do something
  }
});
```

This not only adds verbosity to code, but also requires that you symetrically tear down any bindings you setup. By utilizing the `registerDisposable` API, `ember-lifeline` will ensure your registered disposable function will run when the object is destroyed, provided that you call `runDisposables` during your objects destruction.

```js
// app/components/foo-bar.js
import Component from '@ember/component';
import { run } from '@ember/runloop';
import { registerDisposable, runDisposables } from 'ember-lifeline';
import DOMish from 'some-external-library';

export default Component.extend({
  init() {
    this._super(...arguments);

    this.DOMish = new DOMish();

    this.bindEvents();
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  }

  bindEvents() {
    let onFoo = run.bind(this.respondToDomEvent);

    this.DOMish.on('foo', onFoo);

    registerDisposable(this, () => this.DOMish.off('foo', onFoo));
  },

  respondToDOMEvent() {
    // do something
  }
});
```

### DOM event handler entanglement

### `addEventListener`

**tl;dr call `addEventListener(obj, element, eventName, fn, options)` on a
component or route to add a DOM event listener that will be automatically
removed when the component is un-rendered.**

Event listeners pose similar but different challenges. They likewise must have a
runloop added around their callback, and are entangled with an object's lifecycle, in
this case to the detachment of that component from the DOM
(`willDestroyElement`). For example this is an idiomatic and correct way to add
an event listener to the window in Ember:

```js
import Component from '@ember/component';
import { run } from '@ember/runloop';

export default Component.extend({
  didInsertElement() {
    this._super(...arguments);

    this.listener = e => {
      run(() => {
        this.set('windowScrollOffset', e.clientY);
      });
    };

    window.addEventListener(`scroll.${this.elementId}`, this.listener);
  },
  willDestroyElement() {
    window.removeEventListener(`scroll.${this.elementId}`, this.listener);

    this._super(...arguments);
  },
});
```

This verbosity, and the need to do so many things right by hand, is very
unfortunate. With `addEventListener` the above example can be re-written as:

```js
import Component from '@ember/component';
import { addEventListener } from 'ember-lifeline';

export default Component.extend({
  didInsertElement() {
    this._super(...arguments);

    addEventListener(this, window, 'scroll', e => {
      this.set('windowScrollOffset', e.clientY);
    });
  },

  destroy() {
    runDisposables(this);

    this._super(...arguments);
  },
});
```

`addEventListener` will provide the runloop and remove the
listener when `destroy` is called, provided `runDisposables` is called.
`addEventListener` provides several ways to specify an element:

```js
// Attach to an element inside this component
addEventListener(this, '.someClass', 'scroll', fn);

// Attach to the component's element itself
addEventListener(this, 'scroll', fn);

// Attach to a DOM node
addEventListener(this, document.body, 'click', fn);

// Attach to window
addEventListener(this, window, 'scroll', fn);
```

### `removeEventListener`

**tl;dr call `removeEventListener(obj, element, eventName, fn, options)` on a
component or route to actively remove a DOM event listener previously added by a
call to `addEventListener`.**

Although any listener added by a call to `addEventListener` will be teared down when the route or component is being
destroyed, there might be cases where you want to actively remove an existing event listener even during the active
lifecycle, for example when temporarily dealing with high volume events like `scroll` or `mousemove`.

Be sure to pass the identical arguments used when calling `addEventListener`!

### Mixins

Ember lifeline also provides mixins, which extend the object's methods to include lifeline's functions.

To use any of the above mentioned functions in your component, route or service, simply import and apply one or all of these mixins to your class:

- `ContextBoundTasksMixin` for using any of the \*Task methods
- `ContextBoundEventListenersMixin` for using addEventListener
- `DisposableMixin` for using registerDisposable and runDisposable

### Testing

Lifeline's entire purpose is to help ensure you've entangled and ultimately disposed of any outstanding async work in your applications. To help ensure this has occurred, and that you don't have any remaining queued async work, a test helper is provided which will assert that all async is disposed of.

To use the helper using the new ember-qunit module syntax:

```js
// test-helper.js
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import setupLifelineValidation from 'ember-lifeline/test-support';

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

## Credit

This addon was developed internally at Twitch, written originally by [@mixonic](https://github.com/mixonic) and [@rwjblue](https://github.com/rwjblue).

The name `ember-lifeline` was suggested by [@nathanhammod](https://github.com/nathanhammond).
