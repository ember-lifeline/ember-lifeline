import { join } from '@ember/runloop';
import { assert } from '@ember/debug';
import { settled } from '@ember/test-helpers';
import { getQueuedPollTasks, Token } from '../poll-task';

export default function pollTaskFor(token: Token) {
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!getQueuedPollTasks().has(token)
  );

  let task = getQueuedPollTasks().get(token);
  join(null, task);

  return settled();
}
