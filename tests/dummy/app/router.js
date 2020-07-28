import AddonDocsRouter, { docsRoute } from 'ember-cli-addon-docs/router';
import RouterScroll from 'ember-router-scroll';
import config from './config/environment';

const Router = AddonDocsRouter.extend(RouterScroll, {
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function () {
  docsRoute(this, function () {
    this.route('why-use-ember-lifeline');

    this.route('how-it-works');
    this.route('run-disposables');
    this.route('run-task');
    this.route('schedule-task');
    this.route('debounce-task');
    this.route('throttle-task');
    this.route('poll-task');
    this.route('register-disposable');
    this.route('add-event-listener');
    this.route('remove-event-listener');
    this.route('mixins');
    this.route('testing');
  });
  this.route('not-found', { path: '/*path' });
  this.route('foo');
});

export default Router;
