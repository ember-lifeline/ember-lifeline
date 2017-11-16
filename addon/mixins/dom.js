import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';

const PASSIVE_SUPPORTED = (() => {
  let ret = false;

  try {
    let options = Object.defineProperty({}, 'passive', {
      get() {
        ret = true;
      }
    });

    window.addEventListener('test', null, options);
  } catch(err) {
    // intentionally empty
  }
  return ret;
})();

/**
 ContextBoundEventListenersMixin provides a mechanism to attach event listeners
 with runloops and automatic removal when the host object is removed from DOM.

 These capabilities are very commonly needed, so this mixin is by default
 included into all `Ember.View` and `Ember.Component` instances.

 @class ContextBoundEventListenersMixin
 @public
 */
export default Mixin.create({
  init() {
    this._super(...arguments);

    this._listeners = undefined;
  },
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
    assert('Must provide an element (not a DOM selector) when using addEventListener in a tagless component.',
      !this.isComponent || this.tagName !== '' || typeof selector !== 'string');
    assert('Called addEventListener with a css selector before the component was rendered',
      !this.isComponent || typeof selector !== 'string' || this._currentState === this._states.inDOM);
    assert('Must provide an element (not a DOM selector) when calling addEventListener outside of component instance.',
      this.isComponent || typeof selector !== 'string');

    let element = findElement(this.element, selector);
    let callback = run.bind(this, _callback);

    if (!Array.isArray(this._listeners)) {
      this._listeners = [];
    }

    if (!PASSIVE_SUPPORTED) {
      options = undefined;
    }

    element.addEventListener(eventName, callback, options);
    this._listeners.push({ element, eventName, callback, _callback, options });
  },

  /**

   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
  removeEventListener(selector, eventName, callback, options) {
    assert('Must provide an element (not a DOM selector) when using addEventListener in a tagless component.', this.tagName !== '' || typeof selector !== 'string');

    let element = findElement(this.element, selector);

    if (!Array.isArray(this._listeners)) {
      return;
    }

    if (!PASSIVE_SUPPORTED) {
      options = undefined;
    }

    // We cannot use Array.findIndex as we cannot rely on babel/polyfill being present
    for (let i = 0; i < this._listeners.length; i++) {
      let listener = this._listeners[i];
      if (
        listener.element === element
        && listener.eventName === eventName
        && listener._callback === callback
      ) {
        /*
         * Drop the event listener and remove the listener object
         */
        element.removeEventListener(eventName, listener.callback, options);
        this._listeners.splice(i, 1);
        break;
      }
    }
  },

  willDestroy() {
    this._super(...arguments);
    if (Array.isArray(this._listeners)) {
      /* Drop non-passive event listeners */
      for (let i = 0; i < this._listeners.length; i++) {
        let { element, eventName, callback, options } = this._listeners[i];
        element.removeEventListener(eventName, callback, options);
      }
      this._listeners = undefined;
    }
  }
});

function findElement(contextElement, selector) {
  let selectorType = typeof selector;
  let element;

  if (selectorType === 'string') {
    element = contextElement.querySelector(selector);
  } else if (selector.nodeType || selector === window) {
    element = selector;
  }

  assert(`Called addEventListener with selector not found in DOM: ${selector}`, !!element);

  return element;
}
