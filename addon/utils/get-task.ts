import EmberObject from '@ember/object';
import { TaskOrName } from '../interfaces';

export default function getTask(
  obj: EmberObject,
  taskOrName: TaskOrName,
  taskName: string
): Function {
  let type: string = typeof taskOrName;
  let task: Function;

  if (type === 'function') {
    task = taskOrName as Function;
  } else if (type === 'string') {
    task = obj[taskOrName as string];
    if (typeof task !== 'function') {
      throw new TypeError(
        `The method name '${taskOrName}' passed to ${taskName} does not resolve to a valid function.`
      );
    }
  } else {
    throw new TypeError(
      `You must pass a task function or method name to '${taskName}'.`
    );
  }

  return task;
}
