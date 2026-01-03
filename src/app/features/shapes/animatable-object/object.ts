import type { FabricObject } from "fabric";
import { findInsertIndex } from "../../../util/timeline";

export type AnimatableProperties = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  opacity: number;
  angle: number;
  rx: number;
  ry: number;
  fill: [number, number, number, number];
  //   clipPath: string;
};
export interface Keyframe<K extends keyof AnimatableProperties = keyof AnimatableProperties> {
  id: string;
  property: K;
  value: AnimatableProperties[K];
  time: number;
  easing: "";
}

type AnimatableObjectCache = {
  keyframeIndex: number;
  time: number;
  prevTime: number;
  nextTime: number;
};
export class AnimatableObject {
  static animatableProperties: (keyof AnimatableProperties)[] = [
    "left",
    "top",
    "opacity",
    "angle",
    "width",
    "height",
    "scaleX",
    "scaleY",
    "fill",
  ];
  // Should this be private?
  keyframes: { [key in keyof AnimatableProperties]?: Keyframe<key>[] } = {};
  private cache: Partial<Record<keyof AnimatableProperties, AnimatableObjectCache>> = {};

  constructor(public fabricObject: FabricObject) {
    this.freezeProperties(0);
    this.addKeyframe({ property: "fill", easing: "", time: 3, value: [0, 200, 200, 1] });
    this.addKeyframe({ property: "fill", easing: "", time: 8, value: [255, 9, 50, 0.2] });
  }

  freezeProperties(time: number) {
    AnimatableObject.animatableProperties.forEach((property) => {
      let value = this.fabricObject?.get(property);
      if (value === undefined) return;

      // only freeze rx and ry properties for ellipses
      const objectType = this.fabricObject.type;
      const isEllipse = objectType !== "ellipse" && ["rx", "ry"].includes(property);
      if (isEllipse) return;

      const isBackgroundColor = property === "fill";
      if (isBackgroundColor) {
        // we assume that all color property are in rgba format
        const rgba = extractRgbValue(value);
        if (!rgba) return;
        value = rgba;
      }
      this.addKeyframe({ easing: "", property, time, value });
    });
  }
  updateProperty<K extends keyof AnimatableProperties>(key: K, value: AnimatableProperties[K]) {
    let _value: string | number | number[] = value;

    switch (key) {
      case "fill":
        if (!Array.isArray(value)) return;
        _value = `rgba(${value[0]}, ${value[1]}, ${value[2]}, ${value[3]})`;
        break;
      default:
        break;
    }
    this.fabricObject.set(key, _value);
  }
  seek(time: number) {
    for (const _key in this.keyframes) {
      if (!Object.hasOwn(this.keyframes, _key)) continue;

      const key = _key as keyof AnimatableProperties;
      /**Keyframes for a specific animatable property */
      const propertyKeyFrames = this.keyframes[key];
      if (!propertyKeyFrames) continue;

      const numberOfKeyframes = propertyKeyFrames.length;

      const firstKeyframe = propertyKeyFrames[0];
      const lastKeyframe = propertyKeyFrames?.[numberOfKeyframes - 1];

      const isBeforeFirstFrame = time <= firstKeyframe.time;
      if (isBeforeFirstFrame) {
        if (firstKeyframe.value !== this.fabricObject.get(key))
          this.updateProperty(key, firstKeyframe.value);
        continue;
      }

      const isAfterLastFrame = lastKeyframe && time >= lastKeyframe.time;
      if (isAfterLastFrame) {
        if (lastKeyframe.value !== this.fabricObject.get(key)) {
          this.updateProperty(key, lastKeyframe.value);
        }
        continue;
      }

      let cacheIndex;
      let updateCache = true;

      const cacheData = this.cache?.[key];
      if (cacheData) {
        // use the same index if we fall into previous time range
        if (time > cacheData?.prevTime && time <= cacheData.time) {
          cacheIndex = cacheData.keyframeIndex;
          updateCache = false;
        } else if (time > cacheData.time && time <= cacheData.nextTime) {
          cacheIndex = cacheData.keyframeIndex + 1;
        }
      }

      const insertData = cacheIndex
        ? [cacheIndex]
        : findInsertIndex(time, propertyKeyFrames as Keyframe[], "time");
      const keyFrameIndex = insertData?.[0];
      if (!keyFrameIndex) continue;

      const keyFrameAtIndex = propertyKeyFrames[keyFrameIndex];
      const prevKeyFrame = propertyKeyFrames?.[keyFrameIndex - 1];

      if (updateCache) {
        const nextKeyFrame = propertyKeyFrames?.[keyFrameIndex + 1];
        this.cache[key] = {
          keyframeIndex: keyFrameIndex,
          time: keyFrameAtIndex.time,
          prevTime: prevKeyFrame.time,
          nextTime: nextKeyFrame?.time,
        };
      }

      if (time === keyFrameAtIndex.time) {
        this.updateProperty(keyFrameAtIndex.property, keyFrameAtIndex.value);
        continue;
      }
      const duration = keyFrameAtIndex.time - prevKeyFrame.time;
      const startTime = prevKeyFrame.time;
      const progress = time - startTime;
      const percentageProgress = progress / duration;

      const transformedPercentageProgress = parseFloat(
        Easing.easeInOutQuad(percentageProgress).toFixed(3),
      );

      if (isBackground(keyFrameAtIndex) && isBackground(prevKeyFrame)) {
        const value = keyFrameAtIndex.value.map((v, i) => {
          const prev = prevKeyFrame.value[i];
          const deltaValue = v - prev;
          const _value = prev + deltaValue * transformedPercentageProgress;
          return _value;
        }) as AnimatableProperties["fill"];
        this.updateProperty(keyFrameAtIndex.property, value);
      } else if (!isBackground(keyFrameAtIndex) && !isBackground(prevKeyFrame)) {
        const deltaValue = keyFrameAtIndex.value - prevKeyFrame.value;
        const value = prevKeyFrame.value + deltaValue * transformedPercentageProgress;
        this.updateProperty(keyFrameAtIndex.property, value);
      }
    }
  }
  /**
   *
   */
  addKeyframe<K extends keyof AnimatableProperties>(
    keyframe: Omit<Keyframe<K>, "id" | "duration">,
  ) {
    // clear cache when a new keyframe is added for a property
    if (this.cache[keyframe.property]) {
      this.cache[keyframe.property] = undefined;
    }
    const propertyKeyFrames = this.keyframes[keyframe.property] || [];
    const res = findInsertIndex(keyframe.time, propertyKeyFrames, "time");
    if (!res) return;
    if (!this.keyframes[keyframe.property]) {
      this.keyframes[keyframe.property] = [];
    }

    const [insertIndex, shouldReplace] = res;
    const keyframeId = crypto.randomUUID();

    this.keyframes[keyframe.property]?.splice(insertIndex, shouldReplace ? 1 : 0, {
      ...keyframe,
      id: keyframeId,
    });
    return { keyframeId, insertIndex, shouldReplace };
  }
  deleteKeyframe<K extends keyof AnimatableProperties>(property: K, id: string) {
    if (!this.keyframes[property]) return;
    const keyframes = this.keyframes[property];
    this.keyframes[property] = keyframes.filter((i) => i.id !== id) as typeof keyframes;
    if (this.keyframes[property].length < 1) delete this.keyframes[property];
  }
}

// source: https://easings.net/
const Easing = {
  linear(x: number) {
    return x;
  },
  //
  easeInBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * x * x * x - c1 * x * x;
  },
  easeInCirc(x: number): number {
    return 1 - Math.sqrt(1 - Math.pow(x, 2));
  },
  //
  easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  },
  //
  easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  },
  easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  },
  easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  },
  easeInOutBack(x: number): number {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  },
};

/**A type assertion function that checks Checks if a keyframe is for the `background` property */
const isBackground = (keyframe: Keyframe): keyframe is Keyframe<"fill"> =>
  keyframe.property === "fill";

const extractRgbValue = (value: string) => {
  const data = value
    .match(/\d+\.\d+|\d+/g)
    ?.map((i) => parseFloat(i))
    .filter((i) => i !== undefined);
  if (data?.length === 4) return data;
};

const excludeType = <T extends keyof AnimatableProperties, K extends boolean>(
  keyframe: Keyframe,
  type: T,
  exclude: K,
): keyframe is Keyframe<K extends true ? Exclude<keyof AnimatableProperties, T> : T> =>
  exclude ? keyframe.property !== type : keyframe.property === type;
