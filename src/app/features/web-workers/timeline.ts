type TimeLineCallback = {
  onUpdate?: ((time: number) => void)[];
  onPlay?: ((time: number) => void)[];
  onPause?: ((time: number) => void)[];
  onComplete?: ((time: number) => void)[];
};
export class Timeline {
  #lastTime: null | number = null;
  #time = 0;
  #callback: TimeLineCallback = {};
  #animationFrameCallbackId = 0;

  isPlaying = false;

  constructor(
    public duration = 10,
    public shouldLoop = false,
  ) {}

  get time() {
    return this.#time;
  }
  setTime(t: number, shouldAlert?: boolean) {
    this.#time = t;
    if (shouldAlert) {
      this.#callback?.onUpdate?.forEach((func) => {
        func(this.#time);
      });
    }
  }

  play() {
    this.isPlaying = true;
    this.#lastTime = performance.now();
    this.#callback.onPlay?.forEach((func) => func(this.#time));
    requestAnimationFrame(this.#loop.bind(this));
  }
  pause() {
    this.isPlaying = false;
    cancelAnimationFrame(this.#animationFrameCallbackId);
    this.#callback.onPause?.forEach((func) => func(this.#time));
    this.#lastTime = null;
  }

  #loop(now: number) {
    if (!this.isPlaying) return;

    this.#animationFrameCallbackId = requestAnimationFrame(this.#loop.bind(this));

    if (this.#lastTime == null) {
      this.#lastTime = now;
    }

    const dt = Math.max(0, now - this.#lastTime) / 1000;
    this.#lastTime = now;

    const _time = Math.min(this.duration, this.#time + dt);
    this.setTime(_time, true);

    const isComplete = this.#time >= this.duration;

    if (isComplete) {
      this.#callback?.onComplete?.forEach((func) => {
        func(this.#time);
      });
      if (this.shouldLoop) {
        this.setTime(0, true);
      } else {
        this.pause();
      }
    }
  }
  addEventListener(type: keyof TimeLineCallback, func: (time: number) => void) {
    if (!this.#callback?.[type]) {
      this.#callback[type] = [];
    }
    this.#callback[type].push(func);
  }
}
