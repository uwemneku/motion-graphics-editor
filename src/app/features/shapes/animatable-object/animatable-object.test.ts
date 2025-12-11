import { Rect } from "fabric";
import { describe, expect, test } from "vitest";
import { AnimatableObject } from "./object";

describe("Animatable object test", () => {
  const rect = new Rect({ left: 0, right: 0 });
  const animatableObject = new AnimatableObject(rect);

  test("Should have initial keyframes", () => {
    Object.entries(animatableObject.keyframes).forEach(([property, keyframes]) => {
      // @ts-expect-error correct type
      expect(AnimatableObject.animatableProperties.includes(property)).toBe(true);
      expect(keyframes?.length).toBe(1);
      expect(keyframes[0].time).toBe(0);
      expect(keyframes[0].property).toBe(property);
    });
  });

  test("Should add keyframe", () => {
    animatableObject.addKeyframe({ property: "left", value: 100, easing: "", time: 10 });
    const leftKeyFrames = animatableObject.keyframes.left;
    expect(leftKeyFrames?.length).toBe(2);
    expect(leftKeyFrames?.map((i) => i.time)).toStrictEqual([0, 10]);

    // replace existing keyframe
    animatableObject.addKeyframe({ property: "left", value: 50, easing: "", time: 10 });
    expect(leftKeyFrames?.length).toBe(2);
    expect(leftKeyFrames?.map((i) => i.time)).toStrictEqual([0, 10]);

    // add new keyframe
    animatableObject.addKeyframe({ property: "left", value: 10, easing: "", time: 8 });
    expect(leftKeyFrames?.length).toBe(3);
    expect(leftKeyFrames?.map((i) => i.time)).toStrictEqual([0, 8, 10]);
  });

  test("Should seek fabric object", () => {
    animatableObject.seek(0);
    expect(rect.get("left")).toBe(0);

    animatableObject.seek(10);
    expect(rect.get("left")).toBe(50);
    expect(rect.get("scaleX")).toBe(1);

    animatableObject.addKeyframe({ property: "scaleX", time: 0, value: 0, easing: "" });
    animatableObject.addKeyframe({ property: "scaleX", time: 10, value: 3, easing: "" });
    animatableObject.seek(10);
    expect(rect.get("left")).toBe(50);
    expect(rect.get("scaleX")).toBe(3);

    animatableObject.seek(4);
    expect(rect.get("left")).toBe(5);

    animatableObject.seek(4);
    expect(parseFloat(rect.get("scaleX")).toFixed(1)).toBe("1.2");
  });

  test("Object animation with seek function", () => {
    const animatableObject1 = new AnimatableObject(rect);
    animatableObject1.keyframes = {
      left: [
        {
          easing: "",
          property: "left",
          time: 0,
          value: 682.5,
          id: "62886ad4-c00d-4b20-baf0-3ea9aefb6487",
        },
        {
          property: "left",
          time: 2,
          value: 288.5,
          easing: "",
          id: "4b81e4d6-a3b7-445d-82e7-3cc9d3b47260",
        },
        {
          property: "left",
          time: 3,
          value: 388.5,
          easing: "",
          id: "4b81e4d6-a3b7-445d-82e7-3cc9d3b47260",
        },
        {
          property: "left",
          time: 3.5,
          value: 388.5,
          easing: "",
          id: "4b81e4d6-a3b7-445d-82e7-3cc9d3b47260",
        },
        // 713
        {
          property: "left",
          time: 12,
          value: 1101.5,
          easing: "",
          id: "763dc6a9-3b12-4790-81c0-133e2ec06fae",
        },
      ],
      top: [
        {
          easing: "",
          property: "top",
          time: 0,
          value: 479,
          id: "8836f63d-106f-46d9-84de-bba4b7a63744",
        },
        {
          property: "top",
          time: 2.074790909102832,
          value: 92,
          easing: "",
          id: "eecb9c67-ab83-4bdf-ad80-d18c5ecdd5a3",
        },
        {
          property: "top",
          time: 9.992094861660078,
          value: 281,
          easing: "",
          id: "580ec6c8-1f38-4bbe-88ab-fb4c5e96bb7d",
        },
      ],
    };

    animatableObject1.seek(1, true);
    expect(animatableObject1.fabricObject.get("left")).toBe(485.5);
    animatableObject1.seek(4, true);
    expect((animatableObject1.fabricObject.get("left") as number).toFixed(1)).toBe("430.4");
  });
});
