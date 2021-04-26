import { run } from '@ember/runloop';
import Component from '@glimmer/component';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, triggerEvent } from '@ember/test-helpers';
import { addEventListener, removeEventListener } from 'ember-lifeline';
import { PASSIVE_SUPPORTED } from 'ember-lifeline/dom-event-listeners';

module('ember-lifeline/dom-event-listeners', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    let testContext = this;
    let name = 'component:under-test';

    this.owner.register(
      name,
      class UnderTest extends Component {
        constructor() {
          super(...arguments);
          testContext.componentInstance = this;
        }
      }
    );

    this.Component = this.owner.factoryFor
      ? this.owner.factoryFor(name)
      : this.owner._lookupFactory(name);
  });

  [
    {
      testName: 'addEventListener(_,_,_,undefined)',
      testedOptions: undefined,
    },
    {
      testName: 'addEventListener(_,_,_,{passive:false})',
      testedOptions: { passive: false },
    },
  ].forEach(({ testName, testedOptions }) => {
    test(`${testName} throws if callback is undefined`, async function (assert) {
      assert.expect(1);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let childElement = find('.foo');

      assert.throws(() => {
        addEventListener(
          component,
          childElement,
          'click',
          undefined,
          testedOptions
        );
      }, /Assertion Failed: Must provide a callback to run for the given event name/);
    });

    test(`${testName} adds event listener to child element`, async function (assert) {
      assert.expect(4);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let childElement = find('.foo');

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      addEventListener(
        component,
        childElement,
        'click',
        (event) => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(childElement, 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'foo',
        'target has the expected class'
      );
    });

    test(`${testName} adds event listener to child element with multiple handler args`, async function (assert) {
      assert.expect(4);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let childElement = find('.foo');

      let calls = 0;
      let hadRunloop = null;
      let handledArgs = null;

      addEventListener(
        component,
        childElement,
        'drag',
        (...args) => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledArgs = args[0];
        },
        testedOptions
      );

      let delta = {};
      await triggerEvent(childElement, 'drag', {
        details: { delta },
      });

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledArgs.target, 'callback passed a target');
      assert.equal(
        handledArgs.details.delta,
        delta,
        'second argument can be present'
      );
    });

    test(`${testName} adds event listener to non-child element`, async function (assert) {
      assert.expect(5);

      this.set('show', true);
      await render(
        hbs`{{#if this.show}}<UnderTest />{{/if}}<span class="foo"></span>`
      );
      let component = this.componentInstance;
      let ranCallback = 0;
      let hadRunloop = null;
      let handledEvent = null;
      let childElement = find('.foo');

      addEventListener(
        component,
        childElement,
        'click',
        (event) => {
          ranCallback++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(childElement, 'click');

      assert.equal(ranCallback, 1, 'callback was called once');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(!!handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'foo',
        'target has the expected class'
      );

      this.set('show', false);

      // Trigger the event on the child element again, after the component
      // is removed from DOM. The listener should not fire this time.
      await triggerEvent(childElement, 'click');

      assert.equal(ranCallback, 1, 'callback was not called a second time');
    });

    test(`${testName} throws when called with incorrect arguments`, async function (assert) {
      assert.expect(5);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let element = find('.foo');

      assert.throws(() => {
        addEventListener(component, null, 'click', () => {}, testedOptions);
      }, /Must provide a DOM element/);

      assert.throws(() => {
        addEventListener(component, '.el', 'click', () => {}, testedOptions);
      }, /Must provide an element \(not a DOM selector\)/);

      assert.throws(() => {
        addEventListener(
          component,
          () => {},
          'click',
          () => {},
          testedOptions
        );
      }, /Must provide an element \(not a DOM selector\)/);

      assert.throws(() => {
        addEventListener(component, element, null, () => {}, testedOptions);
      }, /Must provide an eventName that specifies the event type/);

      assert.throws(() => {
        addEventListener(component, element, 'click', null, testedOptions);
      }, /Must provide a callback to run for the given event name/);
    });

    test(`${testName} listeners on different contexts can be torn down without impacting other contexts`, async function (assert) {
      assert.expect(2);

      let testContext = this;
      this.owner.register(
        'component:under-test-a',
        class UnderTestA extends Component {
          constructor() {
            super(...arguments);
            testContext.subjectA = this;
          }
        }
      );
      this.owner.register(
        'component:under-test-b',
        class UnderTestB extends Component {
          constructor() {
            super(...arguments);
            testContext.subjectB = this;
          }
        }
      );

      this.set('showA', true);
      await render(
        hbs`{{#if this.showA}}<UnderTestA />{{/if}}<UnderTestB /><span class="foo"></span>`
      );

      let { subjectA, subjectB } = this;

      let target = find('.foo');

      let calls = 0;
      let callback = () => {
        calls++;
      };
      addEventListener(subjectA, target, 'click', callback, testedOptions);
      addEventListener(subjectB, target, 'click', callback, testedOptions);

      target.click();
      assert.equal(calls, 2, 'two callbacks called');

      this.set('showA', false);

      target.click();
      assert.equal(calls, 3, 'one more callback called for remaining context');
    });

    test(`${testName} listeners are called with correct scope`, async function (assert) {
      assert.expect(2);

      let testContext = this;

      this.owner.register(
        'component:under-test-a',
        class UnderTestA extends Component {
          constructor() {
            super(...arguments);
            testContext.subjectA = this;
          }
        }
      );
      this.owner.register(
        'component:under-test-b',
        class UnderTestB extends Component {
          constructor() {
            super(...arguments);
            testContext.subjectB = this;
          }
        }
      );

      await render(hbs`<UnderTestA /><UnderTestB /><span class="foo"></span>`);

      let { subjectA, subjectB } = this;
      let target = find('.foo');
      let assertScope = (scope) => {
        return function () {
          assert.equal(this, scope);
        };
      };

      addEventListener(
        subjectA,
        target,
        'click',
        assertScope(subjectA),
        testedOptions
      );
      addEventListener(
        subjectB,
        target,
        'click',
        assertScope(subjectB),
        testedOptions
      );

      target.click();
    });

    test(`${testName.replace(
      'add',
      'remove'
    )} removes event listener from child element`, async function (assert) {
      assert.expect(1);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let calls = 0;
      let listener = () => {
        calls++;
      };
      let element = find('.foo');

      addEventListener(component, element, 'click', listener, testedOptions);

      removeEventListener(component, element, 'click', listener, testedOptions);

      await triggerEvent(element, 'click');

      assert.equal(calls, 0, 'callback was not called');
    });

    test(`${testName.replace(
      'add',
      'remove'
    )} throws if callback is undefined`, async function (assert) {
      assert.expect(1);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;
      let element = find('.foo');

      assert.throws(() => {
        removeEventListener(
          component,
          element,
          'click',
          undefined,
          testedOptions
        );
      }, /Assertion Failed: Must provide a callback to run for the given event name/);
    });

    test(`${testName} adds event listener when an element is passed in from a service and removes listener when instance is destroyed`, async function (assert) {
      assert.expect(5);

      let serviceName = 'service:under-test';

      this.owner.register('service:under-test', class extends Service {});

      let factory = this.owner.factoryFor
        ? this.owner.factoryFor(serviceName)
        : this.owner._lookupFactory(serviceName);
      let service = factory.create();

      await render(hbs`<span class="foo"></span>`);

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;
      addEventListener(
        service,
        find('.foo'),
        'click',
        (event) => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent('.foo', 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(!!handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'foo',
        'target has the expected class'
      );

      run(() => service.destroy()); // Listeners should be removed when the service is destroyed

      await triggerEvent('.foo', 'click');

      assert.equal(
        calls,
        1,
        'callback is not called again once the instance is destroyed'
      );
    });
  });

  test('addEventListener(_,_,{passive: false}) permits stopPropogation', async function (assert) {
    assert.expect(2);

    this.owner.register(
      'template:components/under-test',
      hbs`<span class="outer"><span class="inner"></span></span>`
    );
    await render(hbs`<UnderTest />`);
    let component = this.componentInstance;
    let outer = find('.outer');
    let inner = find('.inner');

    let outerCalls = 0;
    addEventListener(component, outer, 'click', () => outerCalls++);

    let innerCalls = 0;
    addEventListener(
      component,
      inner,
      'click',
      (e) => {
        innerCalls++;
        e.stopPropagation();
      },
      { passive: false }
    );

    await triggerEvent(outer.firstChild, 'click', {
      bubbles: true,
    });

    assert.equal(outerCalls, 0, 'outer callback never fires');
    assert.equal(innerCalls, 1, 'inner callback fires');
  });

  if (PASSIVE_SUPPORTED) {
    test('addEventListener(_,_,{once: true}) is only called once', async function (assert) {
      assert.expect(2);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`<UnderTest />`);
      let component = this.componentInstance;

      let calls = 0;
      let listener = () => {
        calls++;
      };
      let element = find('.foo');

      addEventListener(component, element, 'click', listener, { once: true });

      await triggerEvent(element, 'click');
      assert.equal(calls, 1, 'callback was called once');

      await triggerEvent(element, 'click');
      assert.equal(calls, 1, 'callback was called once');
    });
  }

  test('addEventListener to window', async function (assert) {
    assert.expect(1);

    this.owner.register('template:components/under-test', hbs`<span></span>`);
    await render(hbs`<UnderTest />`);
    let component = this.componentInstance;

    let calls = 0;
    let listener = () => {
      calls++;
    };

    addEventListener(component, window, 'click', listener);

    await triggerEvent(window, 'click');
    assert.equal(calls, 1, 'callback was called');
  });
});
