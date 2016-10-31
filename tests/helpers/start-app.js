import Ember from 'ember';
import Application from '../../app';
import config from '../../config/environment';

const { merge, run } = Ember;

export default function startApp(attrs) {
  let application;

  // use defaults, but you can override
  // Ember.assign is not supported on Ember < 2.5
  let attributes = merge({}, config.APP);
  merge(attributes, attrs);

  run(() => {
    application = Application.create(attributes);
    application.setupForTesting();
    application.injectTestHelpers();
  });

  return application;
}
