import { useAppSelector } from "@/app/store";
import type { CSSProperties } from "react";
import type { KeyFrame } from "../../../types";

const KeyFrames = (props: { id: string }) => {
  const _keyFrames =
    useAppSelector((state) => state.timeline.keyFrames?.[props.id]) || [];
  const firstKeyFrame = _keyFrames?.[0];
  const lastKeyFrame = _keyFrames?.[_keyFrames.length - 1];
  const totalDuration =
    lastKeyFrame && firstKeyFrame
      ? lastKeyFrame?.timeStamp - firstKeyFrame?.timeStamp
      : 0;
  const widthPercent = (totalDuration / 10) * 100 || 0;
  const startPosition = (firstKeyFrame?.timeStamp / 10) * 100 || 0;

  console.log({ totalDuration, widthPercent, startPosition });

  return (
    <div className="relative flex w-full gap-5">
      <div
        className="size-6 rounded-md bg-green-500"
        style={{
          width: `${widthPercent}%`,
          marginLeft: `${startPosition}%`,
        }}
      />
      <div className="absolute w-full">
        {_keyFrames.map((e) => (
          <Frame
            key={e.id}
            {...e}
            style={{ left: `${(e.timeStamp / 10) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const Frame = (props: KeyFrame & { style: CSSProperties }) => {
  const isSelected = false;
  const selectKeyFrame = () => {};

  return (
    <div
      onClick={() => selectKeyFrame(isSelected ? undefined : props)}
      className="absolute top-0 z-50 size-2 translate-x-[-50%] rotate-45 bg-black"
      style={{ ...props.style, border: isSelected ? "2px solid red" : "none" }}
    ></div>
  );
};

export default KeyFrames;
