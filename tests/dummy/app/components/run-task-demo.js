import Component from '@ember/component';
import layout from '../templates/components/run-task-demo';
import { runTask, runDisposables } from 'ember-lifeline';

// BEGIN-SNIPPET run-task-demo.js
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
