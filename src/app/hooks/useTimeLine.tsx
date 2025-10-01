import gsap from "gsap";
import { produce, type WritableDraft } from "immer";
import { create } from "zustand";
import type { KeyFrame, TimeLineStore } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "../util/timeline";

// gsap.registerPlugin(GSDevTools);

//
const useTimeLine = create<TimeLineStore>((set, get) => {
  const timeline = gsap.timeline({
    paused: true,
    id: "main-timeline",
    smoothChildTiming: false,
    repeat: Infinity,
    onUpdate: () => {
      set({ progress: timeline.progress() });
    },
    onComplete: () => {},
  });
  timeline.to("#root", { duration: 10 });

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

    // Animate from previous keyframe to current keyframe
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
          ease: "none",
          id: `${keyFrame.timeStamp}${elementId}`,
        },

        prevKeyFrame?.timeStamp || 0,
      );
      timeline.invalidate(); // to recalculate the timeline

      // If there is a next keyframe, animate from current to next
      if (nextKeyFrame) {
        const t = timeline.getById(`${nextKeyFrame.timeStamp}${elementId}`);

        if (t) timeline.remove(t);
        timeline.to(
          node,
          {
            konva: nextKeyFrame.animatable,
            duration: nextKeyFrame.timeStamp - keyFrame.timeStamp,
            ease: "none",
            id: `${nextKeyFrame.timeStamp}${elementId}`,
          },
          keyFrame.timeStamp,
        );
      }
      timeline.invalidate(); // to recalculate the timeline
      timeline.progress(keyFrame.timeStamp / timeline.duration());
    }
  };

  return {
    timeline,
    keyFrames: [],
    nodesIndex: [],
    nodes: {},
    isPaused: true,
    progress: 0,
    aspectRatio: 16 / 9,
    videoDimensions: { width: 1920, height: 1080 },

    setAspectRatio(ratio) {
      set({ aspectRatio: ratio });
    },
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
      get().selectNode(undefined);
      get().removeNode(id);
      get().timeline.invalidate();
    },
    createNode(...args) {
      updateDraft((draft) => {
        const id = crypto.randomUUID();
        draft.selectedNodeId = id;
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
        if (!draft.nodes[id] || draft.nodes[id].element) return;
        draft.nodes[id].element = node;
      });
    },
    selectKeyFrame(keyFrame) {
      updateDraft((draft) => {
        draft.selectedKeyFrame = keyFrame;
      });
    },
    removeNode(id) {
      updateDraft((draft) => {
        draft.nodes[id]?.element?.destroy();
        delete draft.nodes[id];
        draft.nodesIndex = draft.nodesIndex.filter((e) => e !== id);
      });
    },
    addKeyFrame(elementId, keyFrame) {
      const keyframeId = crypto.randomUUID();
      const nodeData = get().nodes[elementId];
      let currentIndex = 0;
      updateDraft((draft) => {
        if (!draft.nodes[elementId]) return;
        const { insertIndex, keyframes } = insertKeyFrameIntoElementTimeline(
          { ...keyFrame, id: keyframeId },
          draft.nodes?.[elementId].keyframes || [],
        );
        draft.nodes[elementId].keyframes = keyframes;
        currentIndex = insertIndex;
      });
      addTimeline(elementId, currentIndex, { ...keyFrame, id: keyframeId });
    },
    setVideoDimensions(d) {
      updateDraft((draft) => {
        draft.videoDimensions = d;
      });
    },
    togglePlayBack(args) {
      const isPlaying = timeline.isActive();
      const playHeadPosition = timeline.time();
      const progress = timeline.progress();
      if (isPlaying) {
        timeline.pause(undefined, false);
        set({ isPaused: true });
      } else {
        const isCompelete = progress === 1;
        timeline.play(isCompelete ? 0 : playHeadPosition, false);
        set({ isPaused: false });
      }
    },
  };
});

export default useTimeLine;
