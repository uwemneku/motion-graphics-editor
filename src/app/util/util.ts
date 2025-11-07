export function throttle<G = unknown, T extends Array<G> = G[], Y = unknown>(
  mainFunction: (...a: T) => Y,
  delay: number,
) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T): Promise<Y> => {
    return new Promise((res) => {
      if (timer === null) {
        const response = mainFunction(...args);
        res(response);
        timer = setTimeout(() => {
          timer = null;
        }, delay);
      }
    });
  };
}
