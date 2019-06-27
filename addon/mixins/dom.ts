import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import { addEventListener, removeEventListener } from '../dom-event-listeners';
import { runDisposables } from '../utils/disposable';
import { IDestroyable, RunMethod } from '../types';

type MaybeIsComponent = IDestroyable & {
  isComponent?: boolean;
  tagName?: string;
  _currentState?: any;
  _states?: any;
  element?: Element;
};

type TargetOrString = EventTarget | string;
type ElementOrTarget = Element | EventTarget;

/**
 * ContextBoundEventListenersMixin provides a mechanism to attach event listeners
 * with runloops and automatic removal when the host object is removed from DOM.
 *
 * @class ContextBoundEventListenersMixin
 * @public
 */
export default Mixin.create({
  /**
   * Attaches an event listener that will automatically be removed when the host
   * object is dropped from DOM.
   *
   * Example:
   *
   * ```js
   * import Component from 'ember-component';
   * import ContextBoundEventListenersMixin from 'ember-lifeline';
   *
   * export default Component.extend(ContextBoundEventListenersMixin, {
   *   didInsertElement() {
   *     this.addEventListener('.some-item', 'click', (e) => {
   *       console.log('.some-item was clicked');
   *     });
   *   }
   * });
   * ```
   *
   * This can also be used in other ember types like services and controllers. In
   * order to use it there an html element reference must be used instead of a
   * css selector. This way we can be sure the element actually exists when the
   * listener is attached:
   *
   * ```js
   * import Service from 'ember-service';
   * import ContextBoundEventListenersMixin from 'ember-lifeline';
   *
   * export default Service.extend(ContextBoundEventListenersMixin, {
   *   init() {
   *     this._super(...arguments);
   *     const el = document.querySelector('.foo');
   *     this.addEventListener(el, 'click')
   *   }
   * });
   * ```
   *
   * @method addEventListener
   * @param { String | EventTarget } target the DOM selector or element
   * @param { String } _eventName the event name to listen for
   * @param { Function } _callback the callback to run for that event
   * @public
   */
  addEventListener(
    this: MaybeIsComponent,
    target: TargetOrString,
    eventName: string,
    callback: RunMethod<MaybeIsComponent>,
    options?: Object
  ): void {
    assert(
      'Must provide an element (not a DOM selector) when using addEventListener in a tagless component.',
      !this.isComponent || this.tagName !== '' || typeof target !== 'string'
    );
    assert(
      'Called addEventListener with a css selector before the component was rendered',
      !this.isComponent ||
        typeof target !== 'string' ||
        this._currentState === this._states.inDOM
    );
    assert(
      'Must provide an element (not a DOM selector) when calling addEventListener outside of component instance.',
      this.isComponent || typeof target !== 'string'
    );

    let element: ElementOrTarget;

    // If no element is provided, we assume we're adding the event listener to the component's element. This
    // addresses use cases where we want to bind events like `scroll` to the component's root element.
    if (this.isComponent && typeof eventName === 'function') {
      options = callback;
      callback = eventName;
      eventName = <string>target;
      element = this.element!;
    } else {
      element = findElement(this.element!, target);
    }

    addEventListener(this, element, eventName, callback, options);
  },

  /**
   * @method removeEventListener
   * @param { String | EventTarget } target the DOM selector or element
   * @param { String } _eventName the event name to listen for
   * @param { Function } callback the callback to run for that event
   * @public
   */
  removeEventListener(
    this: MaybeIsComponent,
    target: TargetOrString,
    eventName: string,
    callback: RunMethod<MaybeIsComponent>,
    options?: Object
  ): void {
    let element: ElementOrTarget;

    // If no element is provided, we assume we're adding the event listener to the component's element. This
    // addresses use cases where we want to bind events like `scroll` to the component's root element.
    if (this.isComponent && typeof eventName === 'function') {
      callback = eventName;
      eventName = <string>target;
      element = this.element!;
    } else {
      element = findElement(this.element!, target);
    }

    removeEventListener(this, element, eventName, callback, options);
  },

  destroy(): void {
    runDisposables(this);

    this._super(...arguments);
  },
});

function findElement(
  contextElement: Element,
  selector: TargetOrString
): ElementOrTarget {
  let selectorType: string = typeof selector;
  let element!: ElementOrTarget;

  if (selectorType === 'string') {
    let maybeElement: EventTarget | null = contextElement.querySelector(<
      string
    >selector);

    if (maybeElement === null) {
      throw new Error(
        `Called addEventListener with selector not found in DOM: ${selector}`
      );
    }

    element = maybeElement;
  } else if (
    (selector instanceof Element && selector.nodeType) ||
    selector instanceof Window
  ) {
    element = selector;
  }

  return element!;
}
