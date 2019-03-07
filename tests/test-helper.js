import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import './helpers/assert-async-throws';

setApplication(Application.create(config.APP));

start({
  testIsolationValidation: true,
});
