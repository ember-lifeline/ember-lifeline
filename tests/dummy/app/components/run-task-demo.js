import layout from '../templates/components/run-task-demo';
// BEGIN-SNIPPET run-task-demo.js
import Component from '@ember/component';
import { runTask, runDisposables } from 'ember-lifeline';

export default Component.extend({
  layout,

  init() {
    this._super(...arguments);

    runTask(
      this,
      () => {
        this.set('date', new Date());
      },
      500
    );
  },

  willDestroy() {
    this._super(...arguments);

    runDisposables(this);
  },
});
// END-SNIPPET
