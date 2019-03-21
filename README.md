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

This addon introduces several functional utility methods to help manage async, object
lifecycles, and the Ember runloop. These tools should provide a simple developer
experience that allows engineers to focus on the business domain, and think less
about the weird parts of working in a long-lived app.

The [documentation website](https://ember-lifeline.github.io/ember-lifeline/) contains more examples and API information.

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

For more information and examples, please visit the [documentation website](https://ember-lifeline.github.io/ember-lifeline/).

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## Credit

This addon was developed internally at Twitch, written originally by [@mixonic](https://github.com/mixonic) and [@rwjblue](https://github.com/rwjblue). It's since been further developed and maintained by [scalvert](https://github.com/scalvert).

The name `ember-lifeline` was suggested by [@nathanhammod](https://github.com/nathanhammond).
