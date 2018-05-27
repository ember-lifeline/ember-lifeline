export default function getTask(obj, taskOrName, taskName) {
  let type = typeof taskOrName;
  let task;

  if (type === 'function') {
    task = taskOrName;
  } else if (type === 'string') {
    task = obj[taskOrName];
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
