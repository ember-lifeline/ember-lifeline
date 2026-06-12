import Application from 'test-app/app';
import config from 'test-app/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { loadTests } from 'ember-qunit/test-loader';
import { start } from 'ember-qunit';

setApplication(Application.create(config.APP));

setup(QUnit.assert);

// `loadTests()` is called explicitly (rather than letting `start()` do it) so
// that this file works with both ember-qunit v6 (the default scenarios) and
// ember-qunit v9+ (the release/beta/canary scenarios), whose `start()` no
// longer loads tests.
loadTests();
start({
  loadTests: false,
  setupTestIsolationValidation: true,
});
