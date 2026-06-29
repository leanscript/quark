export async function loadNativePackage<T = any>(
  packageName: string,
): Promise<T> {
  try {
    return (await import(packageName)) as T;
  } catch {
    throw new Error(
      `Missing native SQL package "${packageName}". Install it in your application before using this driver.`,
    );
  }
}
