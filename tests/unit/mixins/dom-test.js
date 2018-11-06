/* global Event */
import { run } from '@ember/runloop';
import Component from '@ember/component';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import { module, test, skip } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, find, triggerEvent } from '@ember/test-helpers';
import { ContextBoundEventListenersMixin } from 'ember-lifeline';
import { PASSIVE_SUPPORTED } from 'ember-lifeline/dom-event-listeners';

module('ember-lifeline/mixins/dom', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    let testContext = this;
    let name = 'component:under-test';

    this.owner.register(
      name,
      Component.extend(ContextBoundEventListenersMixin, {
        init() {
          this._super(...arguments);
          testContext.componentInstance = this;
        },
      })
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
    test(`${testName} adds event listener to child element`, async function(assert) {
      assert.expect(4);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      component.addEventListener(
        '.foo',
        'click',
        event => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(component.element.firstChild, 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'foo',
        'target has the expected class'
      );
    });

    test(`${testName} adds event listener to component's element when not providing element`, async function(assert) {
      assert.expect(4);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      component.addEventListener(
        'click',
        event => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(component.element, 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'ember-view',
        'target has the expected class'
      );
    });

    test(`${testName} adds event listener to child element with multiple handler args`, async function(assert) {
      assert.expect(4);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledArgs = null;

      component.addEventListener(
        '.foo',
        'drag',
        (...args) => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledArgs = args[0];
        },
        testedOptions
      );

      let delta = {};
      await triggerEvent(component.element.firstChild, 'drag', {
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

    test(`${testName} adds event listener to non-child element`, async function(assert) {
      assert.expect(5);

      this.set('show', true);
      await render(
        hbs`{{#if show}}{{under-test}}{{/if}}<span class="foo"></span>`
      );
      let component = this.componentInstance;
      let ranCallback = 0;
      let hadRunloop = null;
      let handledEvent = null;
      let element = find('.foo');

      component.addEventListener(
        element,
        'click',
        event => {
          ranCallback++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(element, 'click');

      assert.equal(ranCallback, 1, 'callback was called once');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(!!handledEvent.target, 'callback passed a target');
      assert.equal(
        handledEvent.target.className,
        'foo',
        'target has the expected class'
      );

      this.set('show', false);

      // Trigger the event on the non-child element again, after the component
      // is removed from DOM. The listener should not fire this time.
      await triggerEvent(element, 'click');

      assert.equal(ranCallback, 1, 'callback was not called a second time');
    });

    test(`${testName} throws when there is no element to attach to`, async function(assert) {
      assert.expect(1);

      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      assert.throws(() => {
        component.addEventListener('.foo', 'click', () => {}, testedOptions);
      }, /Called \w+ with selector not found in DOM: .foo/);
    });

    test(`${testName} throws when attached before rendering`, function(assert) {
      assert.expect(1);

      let component = this.Component.create();

      assert.throws(() => {
        component.addEventListener('.foo', 'click', () => {}, testedOptions);
      }, /Called \w+ with a css selector before the component was rendered/);
    });

    test(`${testName} adds event listener to non-child element in tagless component`, async function(assert) {
      assert.expect(5);

      this.set('show', true);
      await render(
        hbs`{{#if show}}{{under-test tagName=""}}{{/if}}<span class="foo"></span>`
      );
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      component.addEventListener(
        find('.foo'),
        'click',
        event => {
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

      this.set('show', false);

      // Trigger the event on the non-child element again, after the component
      // is removed from DOM. The listener should not fire this time.
      await triggerEvent('.foo', 'click');

      assert.equal(calls, 1, 'callback was not called again');
    });

    test(`${testName} throws when using a string selector in a tagless component`, async function(assert) {
      assert.expect(1);

      await render(hbs`{{under-test tagName=""}}<span class="foo"></span>`);
      let component = this.componentInstance;

      assert.throws(() => {
        component.addEventListener('.foo', 'click', () => {}, testedOptions);
      }, /Must provide an element/);
    });

    test(`${testName} listeners on different contexts can be torn down without impacting other contexts`, async function(assert) {
      assert.expect(2);

      let testContext = this;
      this.owner.register(
        'component:under-test-a',
        Component.extend(ContextBoundEventListenersMixin, {
          init() {
            this._super(...arguments);
            testContext.subjectA = this;
          },
        })
      );
      this.owner.register(
        'component:under-test-b',
        Component.extend(ContextBoundEventListenersMixin, {
          init() {
            this._super(...arguments);
            testContext.subjectB = this;
          },
        })
      );

      this.set('showA', true);
      await render(
        hbs`{{#if showA}}{{under-test-a}}{{/if}}{{under-test-b}}<span class="foo"></span>`
      );

      let { subjectA, subjectB } = this;

      let target = find('.foo');

      let calls = 0;
      let callback = () => {
        calls++;
      };
      subjectA.addEventListener(target, 'click', callback, testedOptions);
      subjectB.addEventListener(target, 'click', callback, testedOptions);

      target.click();
      assert.equal(calls, 2, 'two callbacks called');

      this.set('showA', false);

      target.click();
      assert.equal(calls, 3, 'one more callback called for remaining context');
    });

    test(`${testName} listeners are called with correct scope`, async function(assert) {
      assert.expect(2);

      let testContext = this;

      this.owner.register(
        'component:under-test-a',
        Component.extend(ContextBoundEventListenersMixin, {
          init() {
            this._super(...arguments);
            testContext.subjectA = this;
          },
        })
      );
      this.owner.register(
        'component:under-test-b',
        Component.extend(ContextBoundEventListenersMixin, {
          init() {
            this._super(...arguments);
            testContext.subjectB = this;
          },
        })
      );

      await render(
        hbs`{{under-test-a}}{{under-test-b}}<span class="foo"></span>`
      );

      let { subjectA, subjectB } = this;
      let target = find('.foo');
      let assertScope = scope => {
        return function() {
          assert.equal(this, scope);
        };
      };

      subjectA.addEventListener(
        target,
        'click',
        assertScope(subjectA),
        testedOptions
      );
      subjectB.addEventListener(
        target,
        'click',
        assertScope(subjectB),
        testedOptions
      );

      target.click();
    });

    test(`${testName} adds event listener to Window`, async function(assert) {
      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      component.addEventListener(
        window,
        'click',
        event => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(window, 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledEvent.target, 'callback passed a target');
    });

    test(`${testName} adds event listener to SVG element`, async function(assert) {
      this.owner.register(
        'template:components/under-test',
        hbs`<svg class="svg"></svg>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;

      component.addEventListener(
        find('.svg'),
        'click',
        event => {
          calls++;
          hadRunloop = !!run.currentRunLoop;
          handledEvent = event;
        },
        testedOptions
      );

      await triggerEvent(component.element.firstChild, 'click');

      assert.equal(calls, 1, 'callback was called');
      assert.ok(hadRunloop, 'callback was called in runloop');
      assert.ok(handledEvent.target, 'callback passed a target');
    });

    test(`${testName.replace(
      'add',
      'remove'
    )} removes event listener from child element`, async function(assert) {
      assert.expect(1);

      this.owner.register(
        'template:components/under-test',
        hbs`<span class="foo"></span>`
      );
      await render(hbs`{{under-test}}`);
      let component = this.componentInstance;
      let calls = 0;
      let listener = () => {
        calls++;
      };

      component.addEventListener('.foo', 'click', listener, testedOptions);

      component.removeEventListener('.foo', 'click', listener, testedOptions);

      await triggerEvent(component.element.firstChild, 'click');

      assert.equal(calls, 0, 'callback was not called');
    });

    test(`${testName} adds event listener when an element is passed in from a service and removes listener when instance is destroyed`, async function(assert) {
      assert.expect(5);

      let serviceName = 'service:under-test';

      this.owner.register(
        'service:under-test',
        Service.extend(ContextBoundEventListenersMixin)
      );

      let factory = this.owner.factoryFor
        ? this.owner.factoryFor(serviceName)
        : this.owner._lookupFactory(serviceName);
      let component = factory.create();

      await render(hbs`<span class="foo"></span>`);

      let calls = 0;
      let hadRunloop = null;
      let handledEvent = null;
      component.addEventListener(
        find('.foo'),
        'click',
        event => {
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

      run(() => component.destroy()); // Listeners should be removed when the service is destroyed

      await triggerEvent('.foo', 'click');

      assert.equal(
        calls,
        1,
        'callback is not called again once the instance is destroyed'
      );
    });

    test(`${testName} throws when a css selector is passed in from a service instance`, async function(assert) {
      assert.expect(1);

      let serviceName = 'service:under-test';

      this.owner.register(
        'service:under-test',
        Service.extend(ContextBoundEventListenersMixin)
      );

      let factory = this.owner.factoryFor
        ? this.owner.factoryFor(serviceName)
        : this.owner._lookupFactory(serviceName);
      let service = factory.create();

      assert.throws(() => {
        service.addEventListener('.foo', 'click', () => {}, testedOptions);
      }, /Must provide an element/);
    });
  });

  test('addEventListener(_,_,{passive: false}) permits stopPropogation', async function(assert) {
    assert.expect(2);

    this.owner.register(
      'template:components/under-test',
      hbs`<span class="outer"><span class="inner"></span></span>`
    );
    await render(hbs`{{under-test}}`);
    let component = this.componentInstance;

    let outerCalls = 0;
    component.addEventListener('.outer', 'click', () => outerCalls++);

    let innerCalls = 0;
    component.addEventListener(
      '.inner',
      'click',
      e => {
        innerCalls++;
        e.stopPropagation();
      },
      { passive: false }
    );

    await triggerEvent(component.element.firstChild.firstChild, 'click', {
      bubbles: true,
    });

    assert.equal(outerCalls, 0, 'outer callback never fires');
    assert.equal(innerCalls, 1, 'inner callback fires');
  });

  (PASSIVE_SUPPORTED ? test : skip)('addEventListener(_,_,{once: true}) is only called once', async function(assert) {
    assert.expect(2);

    this.owner.register(
      'template:components/under-test',
      hbs`<span class="foo"></span>`
    );
    await render(hbs`{{under-test}}`);
    let component = this.componentInstance;

    let calls = 0;
    let listener = () => {
      calls++;
    };
    let element = find('.foo');

    component.addEventListener('.foo', 'click', listener, { once: true });

    await triggerEvent(element, 'click');
    assert.equal(calls, 1, 'callback was called once');

    await triggerEvent(element, 'click');
    assert.equal(calls, 1, 'callback was called once');
  });
});
