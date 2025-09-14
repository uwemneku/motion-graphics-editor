import gsap from "gsap";
import { produce, type WritableDraft } from "immer";
import { create } from "zustand";
import type { KeyFrame, TimeLineStore } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "../util/timeline";

const useTimeLine = create<TimeLineStore>((set, get) => {
  const timeline = gsap.timeline({ paused: true });

  const updateDraft = (
    callback: (draft: WritableDraft<TimeLineStore>) => void
  ) => {
    set(
      produce<TimeLineStore>((draft) => {
        callback(draft);
      })
    );
  };

  const createTimeLine = () => {
    const timeline = get().timeline;
    timeline.clear();
    timeline.pause(0);
    const node = get()?.nodes?.["circle"]?.element;

    const t = get()?.keyFrames?.reduce((acc, cur, curIndex, arr) => {
      const keyFrameDuration =
        (cur?.timeStamp - (arr[curIndex - 1]?.timeStamp || 0)) * 10;
      const isFirstIndex = curIndex === 0;
      if (cur.animatable) {
        const data = { ...acc, ...cur.animatable };
        console.log({ data });

        for (const p in { ...acc, ...cur.animatable }) {
          const value = cur.animatable?.[p as keyof KeyFrame["animatable"]];
          if (!value) {
            delete cur.animatable?.[p as keyof KeyFrame["animatable"]];
          }
        }
      }

      if (isFirstIndex) {
        timeline.set(node, { konva: cur?.animatable, duration: 0 });
      }

      timeline.to(node, {
        konva: cur?.animatable,
        duration: keyFrameDuration,
        ease: "linear",
        onComplete(...args) {
          console.log("completed", { args });
        },
      });

      return cur?.animatable;
    }, {});

    return timeline;
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
      console.log({ keyFrame });

      updateDraft((draft) => {
        draft.keyFrames = insertKeyFrameIntoElementTimeline(
          keyFrame,
          draft.keyFrames || []
        );
      });
      timeline.clear();
      const node = get()?.nodes?.[elementId]?.element;

      if (!node) return;
      createTimeLine();
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
