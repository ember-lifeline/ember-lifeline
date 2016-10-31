/* global Event */
import Ember from 'ember';
import { skip } from 'qunit';
import { moduleForComponent, test } from 'ember-qunit';
import ContextBoundEventListenersMixin from 'ember-lifeline/mixins/dom';

const { run, $, getOwner, setOwner, Component } = Ember;

moduleForComponent('ember-lifeline/mixins/dom', {
  integration: true,

  beforeEach() {
    let owner = getOwner(this);
    owner.register('component:under-test', Component.extend(ContextBoundEventListenersMixin));
    this.Component = owner._lookupFactory('component:under-test');
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
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    subject.element.innerHTML = '<span class="foo"></span>';

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
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    subject.element.innerHTML = '<span class="foo"></span>';

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
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    subject.element.innerHTML = '<span class="foo"></span>';

    let calls = 0;
    subject.addEventListener('.foo', 'click change', () => {
      calls++;
    }, testedOptions);

    subject.element.firstChild.dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was called');

    subject.element.firstChild.dispatchEvent(new Event('change'));

    assert.equal(calls, 2, 'callback was called again');
  });

  skip(`${testName} adds event listener to non-child element w/ jQuery`, function(assert) {
    assert.expect(5);
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    $('#qunit-fixture').append('<span class="foo"></span>');

    let ranCallback = 0;
    let hadRunloop = null;
    let handledEvent = null;
    subject.addEventListener($('.foo'), 'click', (event) => {
      ranCallback++;
      hadRunloop = !!run.currentRunLoop;
      handledEvent = event;
    }, testedOptions);

    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(ranCallback, 1, 'callback was called once');
    assert.ok(hadRunloop, 'callback was called in runloop');
    assert.ok(!!handledEvent.target, 'callback passed a target');
    assert.equal(handledEvent.target.className, 'foo', 'target has the expected class');

    run(() => {
      subject.remove();
    });

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(ranCallback, 1, 'callback was not called a second tim');
  });

  skip(`${testName} adds event listener to non-child element`, function(assert) {
    assert.expect(5);
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    $('#qunit-fixture').append('<span class="foo"></span>');

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

    run(() => {
      subject.remove();
    });

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was not called again');
  });

  test(`${testName} throws when there is no element to attach to`, function(assert) {
    assert.expect(1);
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });

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

  skip(`${testName} adds event listener to non-child element in tagless component`, function(assert) {
    assert.expect(5);
    let options = { tagName: '' };
    // this is used when creating a tagless component to provide a nice
    // warning when using "event" methods, but since this test harness
    // does not provide an owner/container we just mock it here
    setOwner(options, { lookup() { } });
    let subject = this.Component.create(options);

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    $('#qunit-fixture').append('<span class="foo"></span>');

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

    run(() => {
      subject.remove();
    });

    // Trigger the event on the non-child element again, after the component
    // is removed from DOM. The listener should not fire this time.
    $('.foo')[0].dispatchEvent(new Event('click'));

    assert.equal(calls, 1, 'callback was not called again');
  });

  skip(`${testName} throws when using a string selector in a tagless component`, function(assert) {
    assert.expect(1);
    let options = { tagName: '' };
    // this is used when creating a tagless component to provide a nice
    // warning when using "event" methods, but since this test harness
    // does not provide an owner/container we just mock it here
    setOwner(options, { lookup() { } });
    let subject = this.Component.create(options);

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    $('#qunit-fixture').append('<span class="foo"></span>');

    assert.throws(() => {
      subject.addEventListener('.foo', 'click', () => {}, testedOptions);
    }, /Must provide an element/);
  });

  skip(`${testName} listeners on different contexts can be torn down without impacting other contexts`, function(assert) {
    assert.expect(2);
    let subjectA = this.BaseObject.create();
    let subjectB = this.BaseObject.create();

    try {
      run(() => {
        subjectA.appendTo('#qunit-fixture');
        subjectB.appendTo('#qunit-fixture');
      });
      let target = $('<span class="foo"></span>');
      target.appendTo('#qunit-fixture');

      let calls = 0;
      let callback = () => {
        calls++;
      };
      subjectA.addEventListener(target, 'click', callback, testedOptions);
      subjectB.addEventListener(target, 'click', callback, testedOptions);

      target.click();
      assert.equal(calls, 2, 'two callbacks called');

      run(() => {
        subjectA.destroy();
      });

      target.click();
      assert.equal(calls, 3, 'one more callback called for remaining context');
    } finally {
      run(() => {
        if (!subjectA.isDestroyed) {
          subjectA.destroy();
        }
        subjectB.destroy();
      });
    }
  });

});

test('addEventListener(_,_) coalesces multiple listeners on same event', function(assert) {
  assert.expect(1);
  let subject = this.Component.create();

  run(() => {
    subject.appendTo('#qunit-fixture');
  });
  subject.element.innerHTML = '<span class="foo"></span>';

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

  skip('addEventListener(_,_) raises on preventDefault', function(assert) {
    assert.expect(1);
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    subject.element.innerHTML = '<span class="foo"></span>';

    subject.addEventListener('.foo', 'click', (e) => {
      assert.throws(() => {
        e.preventDefault();
      }, /Passive event listeners/);
    });

    subject.element.firstChild.dispatchEvent(new Event('click'));
  });

  skip('addEventListener(_,_) raises on stopPropogation', function(assert) {
    assert.expect(1);
    let subject = this.Component.create();

    run(() => {
      subject.appendTo('#qunit-fixture');
    });
    subject.element.innerHTML = '<span class="foo"></span>';

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
  let subject = this.Component.create();

  run(() => {
    subject.appendTo('#qunit-fixture');
  });
  subject.element.innerHTML = '<span class="foo"></span>';

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
  let subject = this.Component.create();

  run(() => {
    subject.appendTo('#qunit-fixture');
  });
  subject.element.innerHTML = '<span class="outer"><span class="inner"></span></span>';

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
