import { module, test } from 'qunit';
import { getTestAwareTimerVal } from 'ember-lifeline/utils/timer';

module('ember-lifeline/utils/timer', function () {
  test('getTestAwareTimerVal will scale down the timer value by 100x by default in the test environment', function (assert) {
    assert.expect(3);

    assert.equal(
      getTestAwareTimerVal(100),
      1,
      'timer value has been scaled down'
    );
    assert.equal(
      getTestAwareTimerVal(500),
      5,
      'timer value has been scaled down'
    );
    assert.equal(
      getTestAwareTimerVal(3000),
      30,
      'timer value has been scaled down'
    );
  });

  test('getTestAwareTimerVal will return the custom test timer value if passed in the test environment', function (assert) {
    assert.expect(3);

    assert.equal(
      getTestAwareTimerVal(100, 2),
      2,
      'custom test timer value is returned'
    );
    assert.equal(
      getTestAwareTimerVal(500, 3),
      3,
      'custom test timer value is returned'
    );
    assert.equal(
      getTestAwareTimerVal(3000, 20),
      20,
      'custom test timer value is returned'
    );
  });
});
