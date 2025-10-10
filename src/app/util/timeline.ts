import { produce } from "immer";
import type { KeyFrame } from "../../types";

export const insertKeyFrameIntoElementTimeline = (
  keyFrame: KeyFrame,
  allKeyFrames: KeyFrame[],
) => {
  let insertIndex = 0;
  const totalKeyFrames = allKeyFrames.length;
  const firstKeyFrame = allKeyFrames[0];

  if (
    totalKeyFrames === 0 ||
    keyFrame?.timeStamp === firstKeyFrame?.timeStamp
  ) {
    return { keyframes: [keyFrame], insertIndex: 0 };
  }

  const trackPosition = keyFrame.timeStamp;
  const lastKeyFrame = allKeyFrames[totalKeyFrames - 1];
  const elementDuration = lastKeyFrame?.timeStamp - firstKeyFrame?.timeStamp;

  const isTrackBeforeFirstKeyFrame =
    !firstKeyFrame ||
    (firstKeyFrame && trackPosition < firstKeyFrame?.timeStamp);
  const isTrackAfterLastKeyFrame = trackPosition > lastKeyFrame?.timeStamp;
  let shouldReplace = false;

  if (isTrackBeforeFirstKeyFrame) {
    insertIndex = 0;
  } else if (isTrackAfterLastKeyFrame) {
    insertIndex = totalKeyFrames;
  } else {
    insertIndex = Math.floor(
      ((trackPosition - firstKeyFrame?.timeStamp) / elementDuration) *
        (totalKeyFrames - 1),
    );

    for (let index = insertIndex; index <= insertIndex + 1; index++) {
      const element = allKeyFrames[index];
      shouldReplace = element?.timeStamp === trackPosition;

      if (element.timeStamp >= trackPosition) {
        insertIndex = index;
        break;
      }
    }
  }

  return {
    keyframes: produce(allKeyFrames, (draft) => {
      draft.splice(insertIndex, shouldReplace ? 1 : 0, keyFrame);
    }),
    insertIndex,
  };
};
