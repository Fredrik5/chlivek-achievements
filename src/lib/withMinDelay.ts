// Ensures a loading state stays visible for at least `minMs`, so fast requests
// don't just flash the spinner while slow ones (bad signal, large uploads) still wait naturally.
export async function withMinDelay<T>(promise: Promise<T>, minMs = 600): Promise<T> {
  const [result] = await Promise.all([promise, new Promise((resolve) => setTimeout(resolve, minMs))]);
  return result;
}
