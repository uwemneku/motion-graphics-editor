import type { FabricObject } from "fabric";
import { insertIntoArray } from "../../../util/timeline";

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
  //   clipPath: string;
};
export interface Keyframe<K extends keyof AnimatableProperties = keyof AnimatableProperties> {
  id: string;
  property: K;
  value: AnimatableProperties[K];
  time: number;
  easing: "";
}
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
  ];
  // Should this be private?
  keyframes: { [key in keyof AnimatableProperties]?: Keyframe<key>[] } = {};

  constructor(public fabricObject: FabricObject) {
    this.freezeProperties(0);
  }

  freezeProperties(time: number) {
    AnimatableObject.animatableProperties.forEach((property) => {
      const value = this.fabricObject?.get(property);
      if (value === undefined) return;
      const objectType = this.fabricObject.type;

      if (objectType !== "ellipse" && ["rx", "ry"].includes(property)) {
        return;
      }

      this.addKeyframe({ easing: "", property, time, value });
    });
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

      const isBeforeFirstFrame = time < firstKeyframe.time;
      if (isBeforeFirstFrame) {
        if (firstKeyframe.value !== this.fabricObject.get(key))
          this.fabricObject.set(key, firstKeyframe.value);
        continue;
      }

      const isAfterFirstFrame = lastKeyframe && time > lastKeyframe.time;
      if (isAfterFirstFrame) {
        if (lastKeyframe.value !== this.fabricObject.get(key))
          this.fabricObject.set(key, lastKeyframe.value);
        continue;
      }

      const res = insertIntoArray(
        { time, easing: "", id: "", property: key, value: 0 },
        propertyKeyFrames,
        "time",
      );
      if (!res) continue;
      const startIndex = res[0];
      const keyFrameAtIndex = propertyKeyFrames[startIndex];
      if (res?.[1]) {
        this.fabricObject.set(keyFrameAtIndex.property, keyFrameAtIndex.value);
        continue;
      }
      const prevKeyFrame = propertyKeyFrames[startIndex - 1];
      const startTime = prevKeyFrame?.time;
      const deltaValue = keyFrameAtIndex.value - prevKeyFrame.value;
      const duration = startTime - keyFrameAtIndex?.time;
      const progress = startTime - time;
      const percentageProgress = progress / duration;
      const newValue = prevKeyFrame.value + percentageProgress * deltaValue;
      this.fabricObject.set(keyFrameAtIndex.property, newValue);
    }
  }
  /**
   *
   */
  addKeyframe<K extends keyof AnimatableProperties>(keyframe: Omit<Keyframe<K>, "id">) {
    const propertyKeyFrames = this.keyframes[keyframe.property] || [];
    const res = insertIntoArray(keyframe, propertyKeyFrames, "time");
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

const Easing = {
  linear(from: number, to: number, progress: number) {
    const delta = to - from;
    return from + delta * Math.min(Math.max(0, progress), 1);
  },
};

// new AppObject().addKeyframe({ property: "clipPath", value: 0, easing: "", id: "", time: 0 });
