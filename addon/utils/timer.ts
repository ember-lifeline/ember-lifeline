import Ember from 'ember';
import { TestTimeoutOptions } from '../types';

/**
 * @function getTimeoutOrTestFallback
 * @param {number} timeoutVal The timeout value that gets scaled down in case of the test environment.
 * @param {number} [customTestTimeout] The timeout value that needs to be set in the test environment if passed
 */
export function getTimeoutOrTestFallback(
  timeoutVal: number,
  options?: TestTimeoutOptions
): number {
  if (Ember.testing) {
    const customTestTimeout = options?.timeout;
    const scaleDownFactor = options?.scaling ?? 100; // Reducing timer value by 100x in test environment by default

    return customTestTimeout !== undefined
      ? customTestTimeout
      : timeoutVal / scaleDownFactor;
  }
  return timeoutVal;
}
