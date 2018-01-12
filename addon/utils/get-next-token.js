let token = 0;

/**
 * Returns a unique token for tasks.
 *
 * @export
 * @public
 * @returns An integer represeting the token.
 */
export default function getNextToken() {
  return token++;
}
