import Ember from 'ember';
import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import { registerDisposable } from './utils/disposable';

const { WeakMap } = Ember;

/**
 * A map of instances/listeners that allows us to
 * store listener references per instance.
 *
 * @private
 *
 */
const eventListeners = new WeakMap();

const PASSIVE_SUPPORTED = (() => {
  let ret = false;

  try {
    let options = Object.defineProperty({}, 'passive', {
      get() {
        ret = true;
      },
    });

    window.addEventListener('test', null, options);
  } catch (err) {
    // intentionally empty
  }
  return ret;
})();

const LISTENER_ITEM_LENGTH = 5;
const INDEX = {
  ELEMENT: 0,
  EVENT_NAME: 1,
  CALLBACK: 2,
  ORIGINAL_CALLBACK: 3,
  OPTIONS: 4,
};

/**
   Attaches an event listener that will automatically be removed when the host
   object is dropped from DOM.

   Example:

   ```js
   import Component from 'ember-component';
   import { addEventListener } from 'ember-lifeline';

   export default Component.extend({
     didInsertElement() {
       addEventListener(this, '.some-item', 'click', (e) => {
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
   import { addEventListener } from 'ember-lifeline';

   export default Service.extend({
     init() {
       this._super(...arguments);
       const el = document.querySelector('.foo');
       addEventListener(this, el, 'click')
     }
   });
   ```

   @method addEventListener
   @param { Object } obj the instance to attach the listener for
   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } _callback the callback to run for that event
   @public
   */
export function addEventListener(obj, selector, eventName, _callback, options) {
  assert(
    'Must provide an element (not a DOM selector) when using addEventListener in a tagless component.',
    !obj.isComponent || obj.tagName !== '' || typeof selector !== 'string'
  );
  assert(
    'Called addEventListener with a css selector before the component was rendered',
    !obj.isComponent ||
      typeof selector !== 'string' ||
      obj._currentState === obj._states.inDOM
  );
  assert(
    'Must provide an element (not a DOM selector) when calling addEventListener outside of component instance.',
    obj.isComponent || typeof selector !== 'string'
  );

  // If no element is provided, we assume we're adding the event listener to the component's element. This
  // addresses use cases where we want to bind events like `scroll` to the component's root element.
  if (obj.isComponent && typeof eventName === 'function') {
    _callback = eventName;
    eventName = selector;
    selector = obj.element;
  }

  let element = findElement(obj.element, selector);
  let callback = run.bind(obj, _callback);

  let listeners = getEventListeners(obj);

  if (!PASSIVE_SUPPORTED) {
    options = undefined;
  }

  element.addEventListener(eventName, callback, options);
  listeners.push(element, eventName, callback, _callback, options);
}

/**
   @param { Object } obj the instance to remove the listener for
   @param { String } selector the DOM selector or element
   @param { String } _eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
export function removeEventListener(
  obj,
  selector,
  eventName,
  callback,
  options
) {
  assert(
    'Must provide an element (not a DOM selector) when using addEventListener in a tagless component.',
    obj.tagName !== '' || typeof selector !== 'string'
  );

  let element = findElement(obj.element, selector);
  let listeners = getEventListeners(obj);

  if (listeners.length === 0) {
    return;
  }

  if (!PASSIVE_SUPPORTED) {
    options = undefined;
  }

  // We cannot use Array.findIndex as we cannot rely on babel/polyfill being present
  for (let i = 0; i < listeners.length; i += LISTENER_ITEM_LENGTH) {
    if (
      listeners[i + INDEX.ELEMENT] === element &&
      listeners[i + INDEX.EVENT_NAME] === eventName &&
      listeners[i + INDEX.ORIGINAL_CALLBACK] === callback
    ) {
      /*
         * Drop the event listener and remove the listener object
         */
      let ownCallback = listeners[i + INDEX.CALLBACK];
      element.removeEventListener(eventName, ownCallback, options);
      listeners.splice(i, LISTENER_ITEM_LENGTH);
      break;
    }
  }
}

function getEventListenersDisposable(eventListeners) {
  return function() {
    if (eventListeners !== undefined) {
      /* Drop non-passive event listeners */
      for (let i = 0; i < eventListeners.length; i += LISTENER_ITEM_LENGTH) {
        let element = eventListeners[i + INDEX.ELEMENT];
        let eventName = eventListeners[i + INDEX.EVENT_NAME];
        let callback = eventListeners[i + INDEX.CALLBACK];
        let options = eventListeners[i + INDEX.OPTIONS];

        element.removeEventListener(eventName, callback, options);
      }
      eventListeners = undefined;
    }
  };
}

function getEventListeners(obj) {
  let listeners = eventListeners.get(obj);

  if (!listeners) {
    listeners = [];
    eventListeners.set(obj, listeners);
    registerDisposable(obj, getEventListenersDisposable(listeners));
  }

  return listeners;
}

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
