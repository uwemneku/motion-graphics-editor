import gsap from "gsap";
import { GSDevTools } from "gsap/all";
import { produce, type WritableDraft } from "immer";
import { create } from "zustand";
import type { KeyFrame, TimeLineStore } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "../util/timeline";

gsap.registerPlugin(GSDevTools);
const useTimeLine = create<TimeLineStore>((set, get) => {
  const timeline = gsap.timeline({
    paused: true,
    id: "main-timeline",
    smoothChildTiming: false,
  });

  GSDevTools.create({ animation: timeline });

  const updateDraft = (
    callback: (draft: WritableDraft<TimeLineStore>) => void
  ) => {
    set(
      produce<TimeLineStore>((draft) => {
        callback(draft);
      })
    );
  };
  const addTimeline = (
    elementId: string,
    curIndex: number,
    keyFrame: KeyFrame
  ) => {
    const timeline = get().timeline;

    const node = get()?.nodes?.[elementId]?.element;

    if (!node) return;
    const allKeyFrames = get().keyFrames;
    const isFirstKeyFrame = allKeyFrames.length === 1;
    if (isFirstKeyFrame) {
      timeline.set(node, { konva: keyFrame.animatable, duration: 0 }, 0);
      return;
    }
    const prevKeyFrame = allKeyFrames[curIndex - 1];
    if (prevKeyFrame) {
      timeline.pause(prevKeyFrame?.timeStamp || 0);
      const t = timeline.getById(`${keyFrame.timeStamp}`);
      if (t) timeline.remove(t); // remove existing tween with same id
      const keyFrameDuration =
        keyFrame?.timeStamp - (prevKeyFrame?.timeStamp || 0);

      timeline.to(
        node,
        {
          konva: keyFrame.animatable,
          duration: keyFrameDuration,
          ease: "linear",
          id: `${keyFrame.timeStamp}`,
        },

        prevKeyFrame?.timeStamp || 0
      );
      timeline.invalidate(); // to recalculate the timeline

      console.log(timeline.getChildren());
    }
  };

  return {
    timeline,
    keyFrames: [],
    nodesIndex: [],
    nodes: {},
    addNode(node, id) {
      updateDraft((draft) => {
        draft.nodesIndex.push(id);
        draft.nodes[id] = { element: node, keyframes: [] };
      });
    },
    removeNode(id) {
      updateDraft((draft) => {
        delete draft.nodes[id];
        draft.nodesIndex = draft.nodesIndex.filter((e) => e !== id);
      });
    },
    addKeyFrame(elementId, keyFrame) {
      const id = crypto.randomUUID();
      let curindex = 0;
      updateDraft((draft) => {
        const { insertIndex, keyframes } = insertKeyFrameIntoElementTimeline(
          { ...keyFrame, id },
          draft.keyFrames || []
        );
        draft.keyFrames = keyframes;
        curindex = insertIndex;
      });
      // createTimeLine();
      addTimeline(elementId, curindex, { ...keyFrame, id });
    },
    play() {
      get()
        .timeline.play(0)
        .then(() => {
          timeline.pause();
        });
    },
  };
});

export default useTimeLine;
