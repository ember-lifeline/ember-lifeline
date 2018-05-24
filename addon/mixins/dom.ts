import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import { addEventListener, removeEventListener } from '../dom-event-listeners';
import { runDisposables } from '../utils/disposable';
import EmberObject from '@ember/object';

type MaybeComponent = EmberObject & { isComponent?: boolean, tagName?: string, _currentState?: any, _states?: any, element?: any }; // an ember object that MIGHT have isComponent boolean

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
   import ContextBoundEventListenersMixin from 'ember-lifeline';

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
   import ContextBoundEventListenersMixin from 'ember-lifeline';

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
  addEventListener(this: MaybeComponent, selector, eventName, callback, options) {
    assert(
      'Must provide an element (not a DOM selector) when using addEventListener in a tagless component.',
      !this.isComponent || this.tagName !== '' || typeof selector !== 'string'
    );
    assert(
      'Called addEventListener with a css selector before the component was rendered',
      !this.isComponent ||
        typeof selector !== 'string' ||
        this._currentState === this._states.inDOM
    );
    assert(
      'Must provide an element (not a DOM selector) when calling addEventListener outside of component instance.',
      this.isComponent || typeof selector !== 'string'
    );

    let element;

    // If no element is provided, we assume we're adding the event listener to the component's element. This
    // addresses use cases where we want to bind events like `scroll` to the component's root element.
    if (this.isComponent && typeof eventName === 'function') {
      options = callback;
      callback = eventName;
      eventName = selector;
      element = this.element;
    } else {
      element = findElement(this.element, selector);
    }

    addEventListener(this, element, eventName, callback, options);
  },

  /**
   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
  removeEventListener(this: MaybeComponent, selector, eventName, callback, options) {
    let element;

    // If no element is provided, we assume we're adding the event listener to the component's element. This
    // addresses use cases where we want to bind events like `scroll` to the component's root element.
    if (this.isComponent && typeof eventName === 'function') {
      callback = eventName;
      eventName = selector;
      element = this.element;
    } else {
      element = findElement(this.element, selector);
    }

    removeEventListener(this, element, eventName, callback, options);
  },

  destroy() {
    runDisposables(this);

    this._super(...arguments);
  },
});

function findElement(contextElement, selector) {
  let selectorType = typeof selector;
  let element;

  if (selectorType === 'string') {
    element = contextElement.querySelector(selector);
  } else if (selector.nodeType || selector === window) {
    element = selector;
  }

  assert(
    `Called addEventListener with selector not found in DOM: ${selector}`,
    !!element
  );

  return element;
}
