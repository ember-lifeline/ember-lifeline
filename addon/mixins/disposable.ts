import Mixin from '@ember/object/mixin';
import { registerDisposable, runDisposables } from '../utils/disposable';

/**
 * DisposableMixin provides a mechanism register disposables with automatic disposing when the
 * host object is destroyed.
 *
 * @class DisposableMixin
 * @public
 */
export default Mixin.create({
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
  registerDisposable(dispose: Function): void {
    registerDisposable(this, dispose);
  },

  destroy(): void {
    runDisposables(this);

    this._super(...arguments);
  },
});
