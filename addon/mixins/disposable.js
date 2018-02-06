import Mixin from '@ember/object/mixin';
import { registerDisposable, runDisposables } from '../utils/disposable';
import { DESTROY_PATCHED } from '../utils/flags';

/**
 DisposableMixin provides a mechanism register disposables with automatic disposing when the
 host object is destroyed.

 @class ContextBoundTasksMixin
 @public
 */
export default Mixin.create({
  [DESTROY_PATCHED]: true,

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
    return registerDisposable(this, dispose);
  },

  willDestroy() {
    runDisposables(this);

    this._super(...arguments);
  },
});
