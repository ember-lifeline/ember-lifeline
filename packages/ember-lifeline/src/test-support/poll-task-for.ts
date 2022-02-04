import { join } from '@ember/runloop';
import { assert } from '@ember/debug';
import { settled } from '@ember/test-helpers';
import { getQueuedPollTasks } from '../poll-task';
import { Token } from '../types';

export default function pollTaskFor(token: Token) {
  let tick = getQueuedPollTasks().get(token);
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!tick
  );

  join(null, tick);

  return settled();
}
