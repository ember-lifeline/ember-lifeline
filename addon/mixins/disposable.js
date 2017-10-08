import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import getOrAllocate from '../utils/get-or-allocate';

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
   Adds a new disposable to the Ember object. A disposable is a function that
   disposes of resources that are outside of Ember's lifecyle. This essentially
   means you can register a function that you want to run to automatically tear
   down any resources when the Ember object is destroyed.

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

       this.domFooDisposable = this.registerDisposable(() => this.DOMish.off('foo', onFoo));
     },

     respondToDOMEvent() {
       // do something
     }
   });
   ```

  @method registerDisposable
  @param { Function } dispose
  @returns A disposable object
  @public
  */
  registerDisposable(dispose) {
    assert('Called \`registerDisposable\` where \`dispose\` is not a function', typeof dispose === 'function');

    let disposables = getOrAllocate(this, '_registeredDisposables', Array);
    let disposable = toDisposable(dispose);

    disposables.push(disposable);

    return disposable;
  },

  willDestroy() {
    runDisposables(this._registeredDisposables);

    this._super(...arguments);
  }
});

function runDisposables(disposables) {
  if (!disposables) {
    return;
  }

  for (let i = 0, l = disposables.length; i < l; i++) {
    let disposable = disposables.pop();

    disposable.dispose();
  }
}

function toDisposable(doDispose) {
  return {
    dispose() {
      if (!this.disposed) {
        this.disposed = true;
        doDispose();
      }
    },
    disposed: false
  };
}
