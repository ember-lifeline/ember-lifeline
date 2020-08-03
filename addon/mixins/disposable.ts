import Mixin from '@ember/object/mixin';
import { deprecate } from '@ember/debug';
import { registerDisposable } from '../utils/disposable';
import { IDestroyable } from 'ember-lifeline/types';

/**
 * DisposableMixin provides a mechanism register disposables with automatic disposing when the
 * host object is destroyed.
 *
 * @class DisposableMixin
 * @public
 */
export default Mixin.create({
  init(...args: any[]) {
    this._super(...args);

    deprecate(
      "ember-lifeline DisposableMixin is deprecated. Please use the functional equivalent of this mixin's methods instead.",
      false,
      {
        id: 'ember-lifeline-deprecated-disposable-mixin',
        until: '7.0.0',
      }
    );
  },

  /**
   * Adds a new disposable to the Ember object. A disposable is a function that
   * disposes of resources that are outside of Ember's lifecyle. This essentially
   * means you can register a function that you want to run to automatically tear
   * down any resources when the Ember object is destroyed.
   *
   * Example:
   *
   * ```js
   * // app/components/foo-bar.js
   * import Ember from 'ember';
   * import DisposableMixin from 'ember-lifeline';
   * import DOMish from 'some-external-library';
   *
   * const { run } = Ember;
   *
   * export default Component.extend(DisposableMixin, {
   *   init() {
   *     this.DOMish = new DOMish();
   *
   *     this.bindEvents();
   *   },
   *
   *   bindEvents() {
   *     let onFoo = run.bind(this.respondToDomEvent);
   *     this.DOMish.on('foo', onFoo);
   *
   *     this.domFooDisposable = this.registerDisposable(() => this.DOMish.off('foo', onFoo));
   *   },
   *
   *   respondToDOMEvent() {
   *     // do something
   *   }
   * });
   * ```
   *
   * @method registerDisposable
   * @param { Function } dispose
   * @public
   */
  registerDisposable(dispose: (destroyable: IDestroyable) => void): void {
    registerDisposable(this, dispose);
  },
});
