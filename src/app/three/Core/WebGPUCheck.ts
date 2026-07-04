/**
 * Detect WebGPU support in the current browser.
 *
 * Returns true only when both the `navigator.gpu` API and
 * a usable GPU adapter are available.
 */
export async function isWebGPUSupported(): Promise<boolean> {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}
