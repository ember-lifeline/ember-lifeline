import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupLifelineValidation } from 'ember-lifeline/test-support';

module('Acceptance | cleaning up disposables', function (hooks) {
  setupLifelineValidation(hooks);
  setupApplicationTest(hooks);

  test('visiting /foo', async function (assert) {
    await visit('/foo');
    assert.equal(currentURL(), '/foo');
  });

  test('visiting /foo again', async function (assert) {
    await visit('/foo');
    assert.equal(currentURL(), '/foo');
  });
});
