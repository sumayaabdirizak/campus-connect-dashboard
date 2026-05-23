/**
 * Uniformly shuffle an array using the Fisher–Yates (Knuth) algorithm.
 *
 * Why not `arr.sort(() => Math.random() - 0.5)`? Because `Array.prototype.sort`
 * expects a consistent comparator; a random comparator violates that contract
 * and biases the output toward original positions (every V8/SpiderMonkey
 * engine exhibits the bias differently — see Mike Bostock's classic post).
 *
 * Returns a NEW array; does not mutate the input. O(n) time, O(n) space.
 */
export function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
