# `addEventListener`

**TL;DR - Call `addEventListener(obj, element, eventName, fn, options)` on a
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
import { addEventListener, runDisposables } from 'ember-lifeline';

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

When importing and using lifeline's functions, **it's imperative that you additionally import and call `runDisposables` during your object's destroy method**. This ensures lifeline will correctly dispose of any remaining async work. Please see {{docs-link "the runDisposables section" "docs.run-disposables"}} for more information.
