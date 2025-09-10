import type gsap from "gsap";
import type { MotionPathPlugin } from "gsap/all";

const testPlugin: typeof MotionPathPlugin = {
  name: "konva",
  init: function (target, value, tween) {
    console.log("hello");
  },
  register(core) {},
};

export default testPlugin;
