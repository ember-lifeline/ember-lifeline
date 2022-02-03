import { join } from '@ember/runloop';
import { assert } from '@ember/debug';
import { settled } from '@ember/test-helpers';
import { queuedPollTasks } from '../poll-task';
import { Token } from '../types';

export default function pollTaskFor(token: Token) {
  assert(
    `You cannot advance pollTask '${token}' when \`next\` has not been called.`,
    !!queuedPollTasks[token]
  );

  join(null, queuedPollTasks[token]);

  return settled();
}
