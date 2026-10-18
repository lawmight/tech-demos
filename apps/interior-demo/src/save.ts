const SAVE_MS = 1200;

export function saveDraft(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, SAVE_MS);
  });
}
