import Mixin from '@ember/object/mixin';
import { addEventListener, removeEventListener } from '../dom-event-listeners';
import { runDisposables } from '../utils/disposable';

/**
 ContextBoundEventListenersMixin provides a mechanism to attach event listeners
 with runloops and automatic removal when the host object is removed from DOM.

 @class ContextBoundEventListenersMixin
 @public
 */
export default Mixin.create({
  /**
   Attaches an event listener that will automatically be removed when the host
   object is dropped from DOM.

   Example:

   ```js
   import Component from 'ember-component';
   import ContextBoundEventListenersMixin from 'ember-lifeline/mixins/dom';

   export default Component.extend(ContextBoundEventListenersMixin, {
     didInsertElement() {
       this.addEventListener('.some-item', 'click', (e) => {
         console.log('.some-item was clicked');
       });
     }
   });
   ```

   This can also be used in other ember types like services and controllers. In
   order to use it there an html element reference must be used instead of a
   css selector. This way we can be sure the element actually exists when the
   listener is attached:

   ```js
   import Service from 'ember-service';
   import ContextBoundEventListenersMixin from 'ember-lifeline/mixins/dom';

   export default Service.extend(ContextBoundEventListenersMixin, {
     init() {
       this._super(...arguments);
       const el = document.querySelector('.foo');
       this.addEventListener(el, 'click')
     }
   });
   ```

   @method addEventListener
   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } _callback the callback to run for that event
   @public
   */
  addEventListener(selector, eventName, _callback, options) {
    addEventListener(this, selector, eventName, _callback, options);
  },

  /**
   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
  removeEventListener(selector, eventName, callback, options) {
    removeEventListener(this, selector, eventName, callback, options);
  },

  destroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
