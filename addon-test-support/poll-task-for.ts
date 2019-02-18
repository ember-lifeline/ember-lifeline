import { join } from '@ember/runloop';
import { assert } from '@ember/debug';
import { queuedPollTasks } from 'ember-lifeline';

export default function pollTaskFor(token) {
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!queuedPollTasks[token]
  );

  return join(null, queuedPollTasks[token]);
}
