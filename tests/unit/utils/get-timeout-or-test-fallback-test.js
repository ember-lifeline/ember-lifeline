import { module, test } from 'qunit';
import { getTimeoutOrTestFallback } from 'ember-lifeline/utils/get-timeout-or-test-fallback';

module('ember-lifeline/utils/get-timeout-or-test-fallback', function () {
  test('getTimeoutOrTestFallback will scale down the timer value by 100x by default in the test environment', function (assert) {
    assert.expect(3);

    assert.equal(
      getTimeoutOrTestFallback(100),
      1,
      'timer value has been scaled down'
    );
    assert.equal(
      getTimeoutOrTestFallback(500),
      5,
      'timer value has been scaled down'
    );
    assert.equal(
      getTimeoutOrTestFallback(3000),
      30,
      'timer value has been scaled down'
    );
  });

  test('getTimeoutOrTestFallback will return the custom test timer value  in the test environment if passed', function (assert) {
    assert.expect(3);

    assert.equal(
      getTimeoutOrTestFallback(100, { timeout: 2 }),
      2,
      'custom test timer value is returned'
    );
    assert.equal(
      getTimeoutOrTestFallback(500, { timeout: 3 }),
      3,
      'custom test timer value is returned'
    );
    assert.equal(
      getTimeoutOrTestFallback(3000, { timeout: 20 }),
      20,
      'custom test timer value is returned'
    );
  });

  test('getTimeoutOrTestFallback will return the scaled down timeout value in the test environment if passed', function (assert) {
    assert.expect(3);

    assert.equal(
      getTimeoutOrTestFallback(100, { scaling: 2 }),
      50,
      'scaled down timeout value is returned'
    );
    assert.equal(
      getTimeoutOrTestFallback(300, { scaling: 3 }),
      100,
      'scaled down timeout value is returned'
    );
    assert.equal(
      getTimeoutOrTestFallback(100, { scaling: 20 }),
      5,
      'scaled down timeout value is returned'
    );
  });
});
