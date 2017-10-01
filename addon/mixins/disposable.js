import Ember from 'ember';

const { Mixin } = Ember;

/**
 DisposableMixin provides a mechanism register disposables with automatic disposing when the
 host object is destroyed.

 @class ContextBoundTasksMixin
 @public
 */
export default Mixin.create({
  init() {
    this._super(...arguments);

    this._registeredDisposables = undefined;
  },

  /**
   Adds a new disposable to the object. A disposable is a function that
   disposes of bindings that are outside of Ember's lifecyle. This essentially
   means you can register a function that you want to run to automatically tear
   down any bindings when the Ember object is destroyed.

   Example:

   ```js
   // app/components/foo-bar.js
   import Ember from 'ember';
   import DOMish from 'some-external-library';

   const { run } = Ember;

   export default Component.extend({
     init() {
       this.DOMish = new DOMish();

       this.bindEvents();
     },

     bindEvents() {
       let onFoo = run.bind(this.respondToDomEvent);
       this.DOMish.on('foo', onFoo);

       this.domFooToken = this.registerDisposable(() => this.DOMish.off('foo', onFoo));
     },

     respondToDOMEvent() {
       // do something
     }
   });
   ```

  @method registerDisposable
  @param { Function } disposable
  @returns A label representing the position of the disposable
  @public
  */
  registerDisposable(disposable) {
    if (typeof disposable !== 'function') {
      throw new Error('You must pass a function as a disposable');
    }

    let disposables = this._getOrAllocateArray('_registeredDisposables');

    return disposables.push(disposable) - 1;
  },

  /**
  Runs a disposable identified by the supplied token.

 ```js
  // app/components/foo-bar.js
  import DOMish from 'some-external-library';
  import Ember from 'ember';

  const { run } = Ember;

  export default Component.extend({
    init() {
      this.DOMish = new DOMish();

      this.bindEvents();
    },

    bindEvents() {
      let onFoo = run.bind(this.respondToDomEvent);
      this.DOMish.on('foo', onFoo);

      this.domFooToken = this.registerDisposable(() => this.DOMish.off('foo', onFoo));
    },

    respondToDOMEvent() {
      // do something
    },

    actions: {
      cancelDOM() {
        this.runDisposable(this.domFooToken);
      }
    }
  });
  ```

  @method runDisposable
  @param {any} label
  @public
  */
  runDisposable(token) {
    runDisposable(this._registeredDisposables, token);
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this._registeredDisposables);
  },

  _getOrAllocateArray(propertyName) {
    if (!this[propertyName]) {
      this[propertyName] = [];
    }

    return this[propertyName];
  },

  _getOrAllocateObject(propertyName) {
    if (!this[propertyName]) {
      this[propertyName] = {};
    }

    return this[propertyName];
  }
});

function runDisposables(disposables) {
  if (!disposables) {
    return;
  }

  for (let i = 0, l = disposables.length; i < l; i++) {
    let disposable = disposables.pop();

    disposable();
  }
}

function runDisposable(disposables, token) {
  if (!disposables || token < 0) {
    return;
  }

  let disposable = disposables[token];

  if (disposable) {
    disposables.splice(token, 1);
    disposable();
  }
}
