/* global Event */
import { run } from '@ember/runloop';

import { getOwner } from '@ember/application';
import Component from '@ember/component';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import { moduleForComponent, test } from 'ember-qunit';
import ContextBoundEventListenersMixin from 'ember-lifeline/mixins/dom';
import { find, triggerEvent } from 'ember-native-dom-helpers';

moduleForComponent('ember-lifeline/mixins/dom', {
  integration: true,

  beforeEach() {
    let testContext = this;
    let name = 'component:under-test';

    this.owner = getOwner(this);
    this.owner.register(name, Component.extend(ContextBoundEventListenersMixin, {
      tagName: 'div',
      init() {
        this._super(...arguments);
        testContext.componentInstance = this;
      }
    }));

    this.Component = this.owner.factoryFor ? this.owner.factoryFor(name) : this.owner._lookupFactory(name);
  }
});

[{
  testName: 'addEventListener(_,_,_,undefined)',
  testedOptions: undefined
}, {
  testName: 'addEventListener(_,_,_,{passive:false})',
  testedOptions: { passive: false }
}].forEach(({ testName, testedOptions }) => {

  test(`${testName} ensures arrays are not eagerly allocated`, function(assert) {
    assert.expect(1);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    assert.notOk(subject._listeners);
  });

  test(`${testName} adds event listener to child element`, function(assert) {
    assert.expect(4);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    let calls = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener('.foo', 'click', (event) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    subject.element.firstChild.dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');
  });

  /*
   * app/views/manager/highlighter.js uses a second argument to the drag
   * handler, "delta". It is unclear if this value comes from a jQuery library
   * or where else. Before this test can be removed one should be certain
   * the codebase only contains uses of addEventListener expecting a single
   * event argument.
   *
   */
  test(`${testName} adds jquery event listener to child element with multiple handler args`, async function(assert) {
    assert.expect(4);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    let calls = 0;
    let hadRunloop = null;
    let handledArgs = null;
    subject.addEventListener('.foo', 'drag', (...args) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledArgs = args[0];
    }, testedOptions);

    let delta = {};
    await triggerEvent(subject.element.firstChild, 'drag', { details: { delta } });

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(handledArgs.target, 'callback passed a target');
    assert.equal(handledArgs.details.delta, delta, 'second argument can be present');
  });

  test(`${testName} adds event listener to non-child element`, async function(assert) {
    assert.expect(5);

    this.set('show', true);
    this.render(hbs`{{#if show}}{{under-test}}{{/if}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    let ranCallback = 0;
    let hadRunloop = null;
    let handledEvent = null;
    let element = find('.foo');
    subject.addEventListener(element, 'click', (event) => {
      ranCallback++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    await triggerEvent(element, 'click');

    assert.equal(ranCallback, 1, 'callback was called once');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    this.set('show', false);

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    await triggerEvent(element, 'click');

    assert.equal(ranCallback, 1, 'callback was not called a second time');
  });

  test(`${testName} throws when there is no element to attach to`, function(assert) {
    assert.expect(1);

    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    assert.throws(() => {
      subject.addEventListener('.foo', 'click', () => {}, testedOptions);
    }, /Called \w+ with selector not found in DOM: .foo/);
  });

  test(`${testName} throws when attached before rendering`, function(assert) {
    assert.expect(1);

    let subject = this.Component.create();

    assert.throws(() => {
      subject.addEventListener('.foo', 'click', () => {}, testedOptions);
    }, /Called \w+ before the component was rendered/);
  });

  test(`${testName} adds event listener to non-child element in tagless component`, async function(assert) {
    assert.expect(5);

    this.set('show', true);
    this.render(hbs`{{#if show}}{{under-test tagName=""}}{{/if}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    let calls = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener(find('.foo'), 'click', (event) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    await triggerEvent('.foo', 'click');

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    this.set('show', false);

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    await triggerEvent('.foo', 'click');

    assert.equal(calls, 1, 'callback was not called again');
  });

  test(`${testName} throws when using a string selector in a tagless component`, function(assert) {
    assert.expect(1);

    this.render(hbs`{{under-test tagName=""}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    assert.throws(() => {
      subject.addEventListener('.foo', 'click', () => {}, testedOptions);
    }, /Must provide an element/);
  });

  test(`${testName} listeners on different contexts can be torn down without impacting other contexts`, function(assert) {
    assert.expect(2);

    let testContext = this;
    this.register('component:under-test-a', Component.extend(ContextBoundEventListenersMixin, {
      init() {
        this._super(...arguments);
        testContext.subjectA = this;
      }
    }));
    this.register('component:under-test-b', Component.extend(ContextBoundEventListenersMixin, {
      init() {
        this._super(...arguments);
        testContext.subjectB = this;
      }
    }));

    this.set('showA', true);
    this.render(hbs`{{#if showA}}{{under-test-a}}{{/if}}{{under-test-b}}<span class="foo"></span>`);

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

  test(`${testName} listeners are called with correct scope`, function(assert) {
    assert.expect(2);

    let testContext = this;
    this.register('component:under-test-a', Component.extend(ContextBoundEventListenersMixin, {
      init() {
        this._super(...arguments);
        testContext.subjectA = this;
      }
    }));
    this.register('component:under-test-b', Component.extend(ContextBoundEventListenersMixin, {
      init() {
        this._super(...arguments);
        testContext.subjectB = this;
      }
    }));

    this.render(hbs`{{under-test-a}}{{under-test-b}}<span class="foo"></span>`);

    let { subjectA, subjectB } = this;

    let target = find('.foo');

    let assertScope = (scope) => {
      return function() {
        assert.equal(this, scope);
      };
    };
    subjectA.addEventListener(target, 'click', assertScope(subjectA), testedOptions);
    subjectB.addEventListener(target, 'click', assertScope(subjectB), testedOptions);

    target.click();
  });

  test(`${testName.replace('add', 'remove')} removes event listener from child element`, async function(assert) {
    assert.expect(1);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    let calls = 0;
    let listener = () => {
      calls++;
    };
    subject.addEventListener('.foo', 'click', listener, testedOptions);

    subject.removeEventListener('.foo', 'click', listener, testedOptions);

    await triggerEvent(subject.element.firstChild, 'click');

    assert.equal(calls, 0, 'callback was not called');
  });

  test(`${testName} adds event listener when an element is passed in from a service instance`, async function(assert) {
    assert.expect(4);

    let serviceName = 'service:under-test';
    let owner = getOwner(this);

    owner.register('service:under-test', Service.extend(ContextBoundEventListenersMixin));

    let factory = owner.factoryFor ? owner.factoryFor(serviceName) : owner._lookupFactory(serviceName);
    let subject = factory.create();

    this.render(hbs`<span class="foo"></span>`);

    let calls = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener(find('.foo'), 'click', (event) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    await triggerEvent('.foo', 'click');

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');
  });
});

test('addEventListener(_,_,{passive: false}) permits stopPropogation', async function(assert) {
  assert.expect(2);

  this.register('template:components/under-test', hbs`<span class="outer"><span class="inner"></span></span>`);
  this.render(hbs`{{under-test}}`);
  let subject = this.componentInstance;

  let outerCalls = 0;
  subject.addEventListener('.outer', 'click', () => outerCalls++);

  let innerCalls = 0;
  subject.addEventListener('.inner', 'click', (e) => {
    innerCalls++;
    e.stopPropagation();
  }, { passive: false });

  await triggerEvent(subject.element.firstChild.firstChild, 'click', { bubbles: true });

  assert.equal(outerCalls, 0, 'outer callback never fires');
  assert.equal(innerCalls, 1, 'inner callback fires');
});

test('addEventListener(_,_,{once: true}) is only called once', async function(assert) {
  assert.expect(2);

  this.register('template:components/under-test', hbs`<span class="foo"></span>`);
  this.render(hbs`{{under-test}}`);
  let subject = this.componentInstance;

  let calls = 0;
  let listener = () => {
    calls++;
  };
  let element = find('.foo');

  subject.addEventListener('.foo', 'click', listener, { once: true });

  await triggerEvent(element, 'click');
  assert.equal(calls, 1, 'callback was called once');

  await triggerEvent(element, 'click');
  assert.equal(calls, 1, 'callback was called once');
});
