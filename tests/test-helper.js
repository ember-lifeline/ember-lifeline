import Ember from 'ember';
import resolver from './helpers/resolver';
import QUnit from 'qunit';
import {
  setResolver
} from 'ember-qunit';
import { start } from 'ember-cli-qunit';

setResolver(resolver);
start();

const TESTS_WITH_LEAKY_ASYNC = [];
const { run } = Ember;

QUnit.testDone(({ module, name }) => {
  if (run.hasScheduledTimers()) {
    TESTS_WITH_LEAKY_ASYNC.push(`${module}: ${name}`);
    run.cancelTimers();
  }
});

QUnit.done(() => {
  if (TESTS_WITH_LEAKY_ASYNC.length > 0) {
    throw new Error(`*****ASYNC LEAKAGE DETECTED!!!!***** The following (${TESTS_WITH_LEAKY_ASYNC.length}) tests setup a timer that was never torn down: \n${TESTS_WITH_LEAKY_ASYNC.join('\n')}`);
  }
});
