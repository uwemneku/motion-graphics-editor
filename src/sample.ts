import type { MotionPathPlugin } from "gsap/all";

const testPlugin: typeof MotionPathPlugin = {
  name: "konva",
  init: function (target, value, tween) {},
  register(core) {},
};

export default testPlugin;
