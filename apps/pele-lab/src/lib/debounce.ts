export type Debounced = (() => void) & { cancel(): void };

export function debounce(waitMs: number, fn: () => void): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      fn();
    }, waitMs);
  }) as Debounced;
  run.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  return run;
}
