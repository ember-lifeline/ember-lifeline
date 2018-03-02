import Ember from 'ember';
import QUnit from 'qunit';
import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-cli-qunit';

setApplication(Application.create(config.APP));
start();

const TESTS_WITH_LEAKY_ASYNC = [];
const { run } = Ember;

QUnit.testStart(() => {
  Ember.testing = true;
});

QUnit.testDone(({ module, name }) => {
  if (run.hasScheduledTimers()) {
    TESTS_WITH_LEAKY_ASYNC.push(`${module}: ${name}`);
    run.cancelTimers();
  }

  Ember.testing = false;
});

QUnit.done(() => {
  if (TESTS_WITH_LEAKY_ASYNC.length > 0) {
    throw new Error(
      `*****ASYNC LEAKAGE DETECTED!!!!***** The following (${
        TESTS_WITH_LEAKY_ASYNC.length
      }) tests setup a timer that was never torn down: \n${TESTS_WITH_LEAKY_ASYNC.join(
        '\n'
      )}`
    );
  }
});
