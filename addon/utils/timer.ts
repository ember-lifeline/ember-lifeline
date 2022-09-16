import Ember from 'ember';

/**
 * @function getTestAwareTimerVal
 * @param {number} timerVal The timer value that gets scaled down in case of the test environment.
 * @param {number} [customTestTimerVal] The timer value that needs to be set in the test environment if passed
 */
export function getTestAwareTimerVal(
  timerVal: number,
  customTestTimerVal?: number
): number {
  if (Ember.testing) {
    return customTestTimerVal !== undefined
      ? customTestTimerVal
      : timerVal / 100; // Reducing timer value by 100x in test environment
  }
  return timerVal;
}
