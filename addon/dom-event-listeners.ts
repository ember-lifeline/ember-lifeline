import { assert } from '@ember/debug';
import { bind } from '@ember/runloop';
import { registerDisposable } from './utils/disposable';
import { IMap } from './interfaces';

/**
 * A map of instances/listeners that allows us to
 * store listener references per instance.
 *
 * @private
 *
 */
const eventListeners: IMap<Object, Array<Object>> = new WeakMap();

const PASSIVE_SUPPORTED: boolean = (() => {
  let ret: boolean = false;

  try {
    let options: AddEventListenerOptions = Object.defineProperty(
      {},
      'passive',
      {
        get() {
          ret = true;
        },
      }
    );

    window.addEventListener('test', null as any, options);
  } catch (err) {
    // intentionally empty
  }
  return ret;
})();

const LISTENER_ITEM_LENGTH = 5;
enum ListenerItemPosition {
  Element = 0,
  eventName = 1,
  callback = 2,
  originalCallback = 3,
  options = 4,
}

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
       addEventListener(this, el, 'click');
     }
   });
   ```

   @method addEventListener
   @param { Object } obj the instance to attach the listener for
   @param { HTMLElement } element the DOM element
   @param { String } eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
export function addEventListener<Target>(
  obj: Target,
  element: HTMLElement,
  eventName: string,
  callback: RunMethod<Target>,
  options: any
): void {
  assertArguments(element, eventName, callback);

  let _callback: EventListenerOrEventListenerObject = bind(obj, callback);
  let listeners: Array<Object> = eventListeners.get(obj);

  if (listeners === undefined) {
    listeners = [];
    eventListeners.set(obj, listeners);
  }

  // Register a disposable every time we go from zero to one.
  if (listeners.length === 0) {
    registerDisposable(obj, getEventListenersDisposable(listeners));
  }

  if (!PASSIVE_SUPPORTED) {
    options = undefined;
  }

  element.addEventListener(eventName, _callback, options);
  listeners.push(element, eventName, _callback, callback, options);
}

/**
   @param { Object } obj the instance to remove the listener for
   @param { HTMLElement } element the DOM element
   @param { String } eventName the event name to listen for
   @param { Function } callback the callback to run for that event
   @public
   */
export function removeEventListener<Target>(
  obj: Target,
  element: HTMLElement,
  eventName: string,
  callback: RunMethod<Target>,
  options: any
): void {
  assertArguments(element, eventName, callback);

  let listeners: Array<Object> = eventListeners.get(obj);

  if (listeners === undefined || listeners.length === 0) {
    return;
  }

  if (!PASSIVE_SUPPORTED) {
    options = undefined;
  }

  // We cannot use Array.findIndex as we cannot rely on babel/polyfill being present
  for (let i = 0; i < listeners.length; i += LISTENER_ITEM_LENGTH) {
    if (
      listeners[i + ListenerItemPosition.Element] === element &&
      listeners[i + ListenerItemPosition.eventName] === eventName &&
      listeners[i + ListenerItemPosition.originalCallback] === callback
    ) {
      /*
         * Drop the event listener and remove the listener object
         */
      let ownCallback: EventListenerOrEventListenerObject = <
        EventListenerOrEventListenerObject
      >listeners[i + ListenerItemPosition.callback];
      element.removeEventListener(eventName, ownCallback, options);
      listeners.splice(i, LISTENER_ITEM_LENGTH);
      break;
    }
  }
}

function assertArguments(
  element: HTMLElement,
  eventName: string,
  callback: any
): void {
  assert('Must provide a DOM element', !!element);
  assert(
    'Must provide an element (not a DOM selector)',
    typeof element !== 'string' &&
      typeof element !== 'function' &&
      element !== null &&
      element !== undefined
  );
  assert(
    'Must provide an eventName that specifies the event type',
    !!eventName
  );
  assert('Must provide a callback to run for the given event name', !!callback);
}

function getEventListenersDisposable(listeners: Array<Object>): Function {
  return function() {
    if (listeners !== undefined) {
      /* Drop non-passive event listeners */
      for (let i = 0; i < listeners.length; i += LISTENER_ITEM_LENGTH) {
        let element: HTMLElement = <HTMLElement>(
          listeners[i + ListenerItemPosition.Element]
        );
        let eventName: string = <string>(
          listeners[i + ListenerItemPosition.eventName]
        );
        let callback: EventListenerOrEventListenerObject = <
          EventListenerOrEventListenerObject
        >listeners[i + ListenerItemPosition.callback];
        let options: Object = listeners[i + ListenerItemPosition.options];

        element.removeEventListener(eventName, callback, options);
      }
      listeners.length = 0;
    }
  };
}
