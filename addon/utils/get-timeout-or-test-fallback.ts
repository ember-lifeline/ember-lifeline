import Ember from 'ember';
import { TestTimeoutOptions } from '../types';

/**
 * @function getTimeoutOrTestFallback
 * @param {number} timeout The timeout value that gets scaled down in case of the test environment.
 * @param {TestTimeoutOptions} [options]
 * @param {number} [options.timeout] The timeout value that needs to be set in the test environment if passed
 * @param {number} [options.scaling] The amount by which the timeout needs to be scaled down
 * @return {number} The adjusted timeout value depending on the environment and scaling factor.
 */
export function getTimeoutOrTestFallback(
  timeout: number,
  { timeout: testTimeout, scaling = 100 }: TestTimeoutOptions = { scaling: 100 } // Reducing timer value by 100x in test environment by default
): number {
  if (Ember.testing) {
    return testTimeout !== undefined ? testTimeout : timeout / scaling;
  }
  return timeout;
}
