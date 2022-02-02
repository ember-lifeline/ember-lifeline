// BEGIN-SNIPPET run-task-demo.js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { runTask } from 'ember-lifeline';

export default class RunTaskDemo extends Component {
  @tracked date;

  constructor() {
    super(...arguments);

    runTask(
      this,
      () => {
        this.date = new Date();
      },
      500
    );
  }
}
// END-SNIPPET
