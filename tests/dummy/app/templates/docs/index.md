# Quickstart

## Installation

    ember install ember-lifeline

## Usage

Ember Lifeline supports a functional API that enables entanglement - _the association of async behavior to object instances_. This allows you to write async code in your classes that can be automatically cleaned up for you when the object is destroyed.

Ember's runloop functions, like the example below, don't ensure that an object's async is cleaned up.

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

Using ember-lifeline's equivalent, in this case `runTask`, can help ensure that any active async is cleaned up once the object is destroyed.

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
