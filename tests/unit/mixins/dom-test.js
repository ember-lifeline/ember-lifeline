/* global Event */
import Ember from 'ember';
import hbs from 'htmlbars-inline-precompile';
import { moduleForComponent, test } from 'ember-qunit';
import ContextBoundEventListenersMixin, { setShouldAssertPassive } from 'ember-lifeline/mixins/dom';

const { run, $, getOwner, Component } = Ember;

moduleForComponent('ember-lifeline/mixins/dom', {
  integration: true,

  beforeEach() {
    let owner = getOwner(this);
    let testContext = this;
    owner.register('component:under-test', Component.extend(ContextBoundEventListenersMixin, {
      init() {
        this._super(...arguments);
        testContext.componentInstance = this;
      }
    }));

    this.Component = owner._lookupFactory('component:under-test');
    setShouldAssertPassive(true);
  }
});

[{
  testName: 'addEventListener(_,_,_,undefined)',
  testedOptions: undefined
}, {
  testName: 'addEventListener(_,_,_,{passive:false})',
  testedOptions: { passive: false }
}].forEach(({ testName, testedOptions }) => {

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
  test(`${testName} adds jquery event listener to child element with multiple handler args`, function(assert) {
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
      handledArgs = args;
    }, testedOptions);

    let delta = {};
    $(subject.element.firstChild).trigger('drag', delta);

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(handledArgs[0].target, 'callback passed a target');
    assert.equal(handledArgs[1], delta, 'second argument can be present');
  });

  test(`${testName} adds multiple listeners to child element`, function(assert) {
    assert.expect(2);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    let calls = 0;
    subject.addEventListener('.foo', 'click change', () => {
      calls++;
    }, testedOptions);

    subject.element.firstChild.dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was called');

    subject.element.firstChild.dispatchEvent(new Event('change'));

    assert.equal(calls, 2, 'callback was called again');
  });

  test(`${testName} adds event listener to non-child element w/ jQuery`, function(assert) {
    assert.expect(5);

    this.set('show', true);
    this.render(hbs`{{#if show}}{{under-test}}{{/if}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    let ranCallback = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener($('.foo'), 'click', (event) => {
      ranCallback++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    this.$('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(ranCallback, 1, 'callback was called once');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    this.set('show', false);

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(ranCallback, 1, 'callback was not called a second tim');
  });

  test(`${testName} adds event listener to non-child element`, function(assert) {
    assert.expect(5);

    this.set('show', true);
    this.render(hbs`{{#if show}}{{under-test}}{{/if}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    let calls = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener($('.foo')[0], 'click', (event) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    });

    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    this.set('show', false);

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was not called again');
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

  test(`${testName} adds event listener to non-child element in tagless component`, function(assert) {
    assert.expect(5);

    this.set('show', true);
    this.render(hbs`{{#if show}}{{under-test tagName=""}}{{/if}}<span class="foo"></span>`);
    let subject = this.componentInstance;

    let calls = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener($('.foo')[0], 'click', (event) => {
      calls++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was called');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    this.set('show', false);

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

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

    let target = this.$('.foo');

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

  test(`${testName.replace('add', 'remove')} removes event listener from child element`, function(assert) {
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

    subject.element.firstChild.dispatchEvent(new Event('click'));

    assert.equal(calls, 0, 'callback was not called');
  });

});

test('addEventListener(_,_) coalesces multiple listeners on same event', function(assert) {
  assert.expect(1);

  this.register('template:components/under-test', hbs`<span class="foo"></span>`);
  this.render(hbs`{{under-test}}`);
  let subject = this.componentInstance;

  let calls = 0;
  let callback = () => calls++;
  subject.addEventListener('.foo', 'click', () => {
    run.scheduleOnce('afterRender', callback);
  });
  subject.addEventListener('.foo', 'click', () => {
    run.scheduleOnce('afterRender', callback);
  });

  subject.element.firstChild.dispatchEvent(new Event('click'));

  assert.equal(calls, 1, 'callback only called once');
});

/* These features are based on ES2015 Proxies */
if (window.Proxy) {

  test('addEventListener(_,_) raises on preventDefault', function(assert) {
    assert.expect(1);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    subject.addEventListener('.foo', 'click', (e) => {
      assert.throws(() => {
        e.preventDefault();
      }, /Passive event listeners/);
    });

    subject.element.firstChild.dispatchEvent(new Event('click'));
  });

  test('addEventListener(_,_) raises on stopPropogation', function(assert) {
    assert.expect(1);

    this.register('template:components/under-test', hbs`<span class="foo"></span>`);
    this.render(hbs`{{under-test}}`);
    let subject = this.componentInstance;

    subject.addEventListener('.foo', 'click', (e) => {
      assert.throws(() => {
        e.stopPropagation();
      }, /Passive event listeners/);
    });

    subject.element.firstChild.dispatchEvent(new Event('click'));
  });

}

test('addEventListener(_,_,{passive: false}) does not coalesce multiple listeners on same event', function(assert) {
  assert.expect(1);

  this.register('template:components/under-test', hbs`<span class="foo"></span>`);
  this.render(hbs`{{under-test}}`);
  let subject = this.componentInstance;

  let calls = 0;
  let callback = () => calls++;
  subject.addEventListener('.foo', 'click', () => {
    run.scheduleOnce('afterRender', callback);
  }, { passive: false });
  subject.addEventListener('.foo', 'click', () => {
    run.scheduleOnce('afterRender', callback);
  }, { passive: false });

  subject.element.firstChild.dispatchEvent(new Event('click'));

  assert.equal(calls, 2, 'click is handled twice');
});

test('addEventListener(_,_,{passive: false}) permits stopPropogation', function(assert) {
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

  subject.element.firstChild.firstChild.dispatchEvent(new Event('click', { bubbles: true }));

  assert.equal(outerCalls, 0, 'outer callback never fires');
  assert.equal(innerCalls, 1, 'inner callback fires');
});
