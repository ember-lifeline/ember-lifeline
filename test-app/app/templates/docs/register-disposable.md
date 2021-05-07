# `registerDisposable`

**TL;DR - Call `registerDisposable(obj, fn)` on any object to register a function you want to run when the object is destroying.**

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
