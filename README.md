# ember-lifeline

Ember applications have long life-cycles. A user may navigate to several pages
and use many different features before they leave the application. This
makes JavaScript and Ember development unlike Rails development, where the
lifecycle of a request is short and the environment disposed of after
each request. It makes Ember development much more like iOS or video game
development than traditional server-side web development.

It is good to note that this isn't something inherent to just Ember. Any
single-page app framework or solution (Angular, React, Vue, Backbone...)
must deal this lifecycles of objects, and specifically with how async
tasks can be bounded by a lifecycle.

There is a fantastic Ember addon, [ember-concurrency](http://ember-concurrency.com/)
that solves these problems in a very exciting and simple way. It is largely
inspired by [RxJS](http://reactivex.io/) and the Observable pattern, both of
which concern themselves with creating life-cycle-free
async that, in practice, tend to be hard for developers to learn.

This addon introduces several utility methods to help manage async, object
lifecycles, and the Ember runloop. These tools should provide a simple developer
experience that allows engineers to focus on the business domain, and think less
about the weird parts of working in a long-lived app.

## Installation

    ember install ember-lifeline
  
To use any of the below mentioned methods in your component, view or service, you will have to import and apply one or both of these mixins to your class:
* `ember-lifeline/mixins/run` for using any of the *Task methods
* `ember-lifeline/mixins/dom` for using `addEventListener`

## Usage

### `runTask`

**tl;dr Call `this.runTask(fn, timeout)` on any component, view, or service to
schedule work.**

Use `runTask` where you might use `setTimeout`, `setInterval`, or
`Ember.run.later`.

`runTask` will handle three common issues with the above APIs.

First, *`setTimeout` and `setInterval` do not use the runloop*. Ember uses
a [work queuing mechanism called the runloop ](https://guides.emberjs.com/v2.5.0/applications/run-loop/).
In order for the queues to flush without autoruns (a feature that helps devs
be lazy in development but is disabled in tests and harms performance), a
runloop must be added around a callstack. For example:

```js
import Ember from 'ember';

const { Component, run } = Ember;

export default Component.extend({
  init() {
    this._super();
    window.setTimeout(() => {
      run(() => {
        this.set('date', new Date);
      });
    }, 500);
  }
});
```

There are [several ways to add runloops in the Ember API docs](http://emberjs.com/api/classes/Ember.run.html),
but regardless it is less than ideal to need to remember and reason about this.
Often `Ember.run.later` is used instead of `setTimeout`, for this reason. However
that still has issues.

Second, *none of `setTimeout`, `setInterval` or `Ember.run.later` bind the
timeout to the lifecycle of the context object*. If the example above is
re-written to use `Ember.run.later`...

```js
import Ember from 'ember';

const { Component, run } = Ember;

export default Component.extend({
  init() {
    this._super();
    run.later(() => {
      this.set('date', new Date);
    }, 500);
  }
});
```

**We're still making a dangerous assumption that this component instance
still exists 500ms from now**. In practice, especially with tests, objects
scheduling timers may be destroyed by the time the timer fires. This causes
a number of unexpected errors. To fix this, the codebase is littered
with checks for `isDestroyed` state on objects retained after destruction:

```js
import Ember from 'ember';

const { Component, run } = Ember;

export default Component.extend({
  init() {
    this._super();
    run.later(() => {
      // First, check if this object is even valid
      if (this.isDestroyed) { return; }
      this.set('date', new Date);
    }, 500);
  }
});
```

The code above is correct, but again, less than simple to write.
Instead, always use `runTask`. `runTask` entangles a timer with the
lifecycle of the object scheduling the work. When the object is destroyed,
the task is also cancelled.

Using `runTask`, the above can be written as:

```js
import Ember from 'ember';
import RunMixin from 'ember-lifeline/mixins/run';

const { Component } = Ember;

export default Component.extend(RunMixin, {
  init() {
    this._super();
    this.runTask(() => {
      this.set('date', new Date);
    }, 500);
  }
});
```

And no need to worry about cancellation or the `isDestroyed` status of the
object itself.

### `debounceTask`

**tl;dr Call `this.debounceTask(methodName, timeout)` on any component, view,
or service to debounce work.**

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
import Ember from 'ember';
import RunMixin from 'ember-lifeline/mixins/run';

const { Component } = Ember;

export default Component.extend(RunMixin, {
  click() {
    this.debounceTask('reportTime', 500);
  },
  reportTime() {
    this.set('time', new Date());
  }
});
```

However if the component is destroyed, any pending debounce task will be
cancelled.

### `throttleTask`

**tl;dr Call `this.throttleTask(methodName, timeout)` on any component, view,
or service to throttle work.**

When a task is throttled, it is executed immediately. For the length of the
timeout, additional throttle calls are ignored. Again, like debounce, throttle
falls prey to many issues shared by `setTimeout`, though fewer since the
work itself is always run immediately. Regardless even just for
consistency the API of `throttleTask` is presented:

```js
import Ember from 'ember';
import RunMixin from 'ember-lifeline/mixins/run';

const { Component } = Ember;

export default Component.extend(RunMixin, {
  click() {
    this.throttleTask('reportTime', 500);
  },
  reportTime() {
    this.set('time', new Date());
  }
});
```

In this example, the first click will update `time`, but clicks after that
for 500ms will be disregarded. Then, the next click will fire and start
a timeout window of its own.

### `pollTask`

**tl;dr call `this.pollTask(fn, label)` on any component, view, or service to setup
polling.**

Use `pollTask` where you might reach for recursive `this.runTask(fn, ms)`, `Ember.run.later`, `setTimeout`, and/or `setInterval`.

When using recursive `runTask` or `run.later` invocations causes tests to pause forever. This is due to the fact
that the Ember testing helpers automatically wait for all scheduled tasks in the run loop to finish before
resuming execution in the normal test context.

And as a reminder, *`setInterval` should never be used*. Say you `setInterval(fn, 20);`.
Regardless of how long `fn` takes, a new call will be scheduled every
20ms. For example if `fn` took 80ms to run (not uncommon), then *four*
new `fn` calls would be in the browser's event queue waiting to fire
immediately. This causes memory issues (the queue may never flush)
and performance problems. Instead, you should be scheduling new work
*after* the previous work was done. For example:

```js
import Component from 'ember-component';
import RunMixin from 'ember-lifeline/mixins/run';

export default Component.extend(RunMixin, {
  init() {
    this._super(...arguments);
    this.updateTime();
  },

  updateTime() {
    this.set('date', new Date());
    this.runTask(() => this.updateTime(), 20);
  }
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
import Component from 'ember-component';
import RunMixin from 'ember-lifeline/mixins/run';

export default Component.extend(RunMixin, {
  init() {
    this._super(...arguments);
    this.updateTime();
  },

  updateTime() {
    this.set('date', new Date());

    if (!Ember.testing) {
      this.runTask(() => this.updateTime(), 20);
    }
  }
});
```

Unfortunately, this makes it very difficult to actually test that the
polling is happening, and often times the polling behavior is itself
either fundamental to the objects purpose or difficult enough to warrant
its own tests.

This is where `pollTask` really shines. You could rewrite the above example to use `pollTask`
like this:

```js
import Component from 'ember-component';
import injectService from 'ember-service/inject';
import RunMixin from 'ember-lifeline/mixins/run';

export default Component.extend(RunMixin, {
  time: injectService(),

  init() {
    this._super(...arguments);

    this.pollTask('updateTime', 'updating-time#updateTime');
  },

  updateTime(next) {
    let time = this.get('time');
    this.set('date', time.now());

    this.runTask(next, 20);
  }
});
```

In development and production, the `updateTime` method is executed initially during the components
`init` and then recursively called every 20ms after its processing finishes. When the component is
destroyed (e.g. no longer rendered on screen) any pending timers from `runTask` or `debounceTask`
calls are properly canceled (as usual with those methods).

In testing, the `updateTime` method would execute initially during the components instantiation (just like
in development and production environments), but would not automatically start polling. This allows
tests that are not related to the polling behavior to continue uninterrupted. To test the actual polling
functionality, use the provided `pollTaskFor` helper:

```js
import moduleForComponent from 'web-client/tests/helpers/module-for-component';
import wait from 'ember-test-helpers/wait';
import { pollTaskFor } from 'web-client/mixins/context-bound-tasks';
import Service from 'ember-service';

let fakeNow;
moduleForComponent('updating-time', {
  integration: true,

  beforeEach() {
    this.register('service:time', Service.extend({
      now() {
        return fakeNow;
      }
    }));
  }
});

test('updating-time updates', function(assert) {
  fakeNow = new Date(2016);

  this.render(hbs`
    {{#updating-time as |time|}}
      {{time}}
    {{/updating-time}}
  `);

  assert.equal(this.$().text().trim(), fakeNow);

  return wait()
    .then(() => {
      fakeNow = new Date(2017);
      pollTaskFor('updating-time#updateTime');

      return wait();
    })
    .then(() => {
      assert.equal(this.$().text().trim(), fakeNow);
    });
});
```

A couple of helpful assertions are provided with the `pollTask` functionality:

* A given `label` can only be used once. If the same `label` is used a second time, an error will be thrown.
* If nothing has been queued for the given label, calling `pollTaskFor(label)` will trigger an error.

### `addEventListener`

**tl;dr call `this.addEventListener(element, eventName, fn, options)` on a component or
view to add a jQuery event listener that will be automatically removed when
the component is un-rendered.**

Event listeners pose similar but different challenges. They likewise must
have a runloop added around their callback, and are pinned to an
object's lifecycle- in this case to the detachment of that component
from the DOM (`willDestroyElement`). For example this is an idiomatic and
correct way to add an event listener to the window in Ember:

```js
import Ember from 'ember';

const { Component, run } = Ember;

export default Component.extend({
  didInsertElement() {
    this._super();
    $(window).on(`scroll.${this.elementId}`, (e) => {
      run(() => {
        this.set('windowScrollOffset', e.clientY);
      });
    });
  },
  willDestroyElement() {
    $(window).off(`scroll.${this.elementId}`);
    this._super();
  }
});
```

This verbosity, and the need to do so many things right by hand, is very
unfortunate. With `addEventListener` the above example can be re-written as:

```js
import Ember from 'ember';
import DomMixin from 'ember-lifeline/mixins/dom';

const { Component } = Ember;

export default Component.extend(DomMixin, {
  didInsertElement() {
    this._super();
    this.addEventListener(window, 'scroll', (e) => {
      this.set('windowScrollOffset', e.clientY);
    });
  }
});
```

`addEventListener` will provide the runloop and automatically remove the
listener when `willDestroyElement` is called. `addEventListener` provides
several ways to specify an element:

```js
// Attach to an element inside this component
this.addEventListener('.someClass', 'scroll', fn);

// Attach to a jQuery list
this.addEventListener(this.$('.someClass'), 'scroll', fn);
// Any jQuery list, even those outside the component
this.addEventListener($('.someClass'), 'scroll', fn);

// Attach to a DOM node
this.addEventListener(document.body, 'click', fn);

// Attach to window
this.addEventListener(window, 'scroll', fn);
```

#### `{passive: true}`

`addEventListener` accepts options as a fourth argument. Currently only a
single option `passive` is accepted, and is defaulted to `true`.
This option mirrors [new options available on native APIs](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
that can be passed to `addEventListener`. Passivity defaulting to `true`
is done with an eye to performance.

Passivity refers to the ability for a handler to either `preventDefault` or,
in our implementation, `stopPropagation`. In dev mode and testing, use of
these APIs on the event object will raise an exception.

### `removeEventListener`

**tl;dr call `this.removeEventListener(element, eventName, fn, options)` on a component or
view to actively remove a jQuery event listener previously added by a call to `addEventListener`.**

Although any listener added by a call to `addEventListener` will be teared down when the view or component is being
destroyed, there might be cases where you want to actively remove an existing event listener even during the active
lifecycle, for example when temporarily dealing with high volume events like `scroll` or `mousemove`.

Be sure to pass the identical arguments used when calling `addEventListener`!

## Credit

This addon was developed internally at Twitch, written originally by [@mixonic](https://github.com/mixonic) and [@rwjblue](https://github.com/rwjblue).

The name `ember-lifeline` was suggested by [@nathanhammod](https://github.com/nathanhammond).
