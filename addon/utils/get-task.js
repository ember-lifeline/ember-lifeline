export default function getTask(obj, taskOrName, taskName) {
  let type = typeof taskOrName;
  let task;

  if (type === 'function') {
    task = taskOrName;
  } else if (type === 'string' && obj[taskOrName]) {
    task = obj[taskOrName];
  } else {
    throw new TypeError(
      `You must pass a task function or method name to '${taskName}'.`
    );
  }

  return task;
}
