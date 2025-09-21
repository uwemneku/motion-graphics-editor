import gsap from "gsap";
import { GSDevTools } from "gsap/all";
import { produce, type WritableDraft } from "immer";
import { create } from "zustand";
import type { KeyFrame, TimeLineStore } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "../util/timeline";

gsap.registerPlugin(GSDevTools);

//
const useTimeLine = create<TimeLineStore>((set, get) => {
  const timeline = gsap.timeline({
    paused: true,
    id: "main-timeline",
    smoothChildTiming: false,
  });

  GSDevTools.create({ animation: timeline });

  const updateDraft = (
    callback: (draft: WritableDraft<TimeLineStore>) => void,
  ) => {
    set(
      produce<TimeLineStore>((draft) => {
        callback(draft);
      }),
    );
  };
  const addTimeline = (
    elementId: string,
    curIndex: number,
    keyFrame: KeyFrame,
  ) => {
    const timeline = get().timeline;
    const nodeData = get().nodes[elementId];
    const node = nodeData?.element;

    if (!node) return;
    const allKeyFrames = nodeData?.keyframes || [];
    const isFirstKeyFrame = allKeyFrames.length === 1;
    if (isFirstKeyFrame) {
      timeline.set(node, { konva: keyFrame.animatable, duration: 0 }, 0);
      timeline.invalidate(); // to recalculate the timeline
      return;
    }
    const prevKeyFrame = allKeyFrames[curIndex - 1];
    const nextKeyFrame = allKeyFrames[curIndex + 1];
    if (prevKeyFrame) {
      timeline.pause(prevKeyFrame?.timeStamp || 0);
      const t = timeline.getById(`${keyFrame.timeStamp}${elementId}`);
      if (t) timeline.remove(t); // remove existing tween with same id
      const keyFrameDuration =
        keyFrame?.timeStamp - (prevKeyFrame?.timeStamp || 0);

      timeline.to(
        node,
        {
          konva: keyFrame.animatable,
          duration: keyFrameDuration,
          ease: "linear",
          id: `${keyFrame.timeStamp}${elementId}`,
        },

        prevKeyFrame?.timeStamp || 0,
      );
      // timeline.invalidate(); // to recalculate the timeline

      if (nextKeyFrame) {
        const t = timeline.getById(`${nextKeyFrame.timeStamp}${elementId}`);
        console.log({ next: t });

        if (t) timeline.remove(t);
        timeline.to(
          node,
          {
            konva: nextKeyFrame.animatable,
            duration: nextKeyFrame.timeStamp - keyFrame.timeStamp,
            ease: "linear",
            id: `${nextKeyFrame.timeStamp}${elementId}`,
          },
          keyFrame.timeStamp,
        );
      }
      timeline.invalidate(); // to recalculate the timeline
      timeline.progress(keyFrame.timeStamp / timeline.duration());
    }
    // log all tweens for this id
    console.log(timeline.getTweensOf(node));
  };

  return {
    timeline,
    keyFrames: [],
    nodesIndex: [],
    nodes: {},
    selectNode(id) {
      updateDraft((draft) => {
        draft.selectedNodeId = id;
      });
    },
    deleteNode(id) {
      const node = get().nodes[id]?.element;
      if (node) {
        node.destroy();
      }
      get().removeNode(id);
      get().timeline.invalidate();
    },
    createNode(...args) {
      updateDraft((draft) => {
        const id = crypto.randomUUID();
        draft.nodesIndex.push(id);
        draft.nodes[id] = {
          type: args[0],
          keyframes: [],
          element: undefined,
          data: args[1],
        };
      });
    },
    addNode(node, id) {
      updateDraft((draft) => {
        if (!draft.nodes[id]) return;
        draft.nodes[id].element = node;
      });
      console.log(get().nodes);
    },
    selectKeyFrame(keyFrame) {
      updateDraft((draft) => {
        draft.selectedKeyFrame = keyFrame;
      });
    },
    removeNode(id) {
      updateDraft((draft) => {
        delete draft.nodes[id];
        draft.nodesIndex = draft.nodesIndex.filter((e) => e !== id);
      });
    },
    addKeyFrame(elementId, keyFrame) {
      const keyframeId = crypto.randomUUID();
      let curindex = 0;
      updateDraft((draft) => {
        if (!draft.nodes[elementId]) return;
        const { insertIndex, keyframes } = insertKeyFrameIntoElementTimeline(
          { ...keyFrame, id: keyframeId },
          draft.nodes?.[elementId].keyframes || [],
        );
        draft.nodes[elementId].keyframes = keyframes;
        curindex = insertIndex;
      });
      addTimeline(elementId, curindex, { ...keyFrame, id: keyframeId });
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
