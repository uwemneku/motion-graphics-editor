import gsap from "gsap";
import { produce, type WritableDraft } from "immer";
import Konva from "konva";
import { create } from "zustand";

interface KeyFrame {
  animatable: {
    x?: number;
    y?: number;
    width?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
  };
  id: string;
  nodeIndex: number;
}

interface TimeLineStore {
  keyFrames: KeyFrame[];
  nodes: Konva.Node[];
  addKeyFrame: (keyFrame: KeyFrame) => void;
  addKonvaNode: (node: Konva.Node) => void;
  play: () => void;
}

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
  return {
    keyFrames: [],
    nodes: [],
    addKonvaNode(node) {
      updateDraft((draft) => {
        draft.nodes.push(node);
      });
    },
    addKeyFrame(keyFrame) {
      updateDraft((draft) => {
        draft.keyFrames.push(keyFrame);
      });
    },
    play() {
      const node = get()?.nodes?.[0];
      timeline.clear();

      const t = get()?.keyFrames?.reduce((acc, cur, curIndex) => {
        const isFirstIndex = curIndex === 0;
        if (cur.animatable)
          for (const p in cur.animatable) {
            const value = cur.animatable?.[p as keyof KeyFrame["animatable"]];
            if (!value) {
              delete cur.animatable?.[p as keyof KeyFrame["animatable"]];
            }
          }

        if (isFirstIndex) {
          return acc.set(node, { konva: cur?.animatable });
        }
        return acc.to(node, {
          konva: cur?.animatable,
          duration: isFirstIndex ? 0 : 1,
          delay: curIndex === 1 ? 2 : 0,
          ease: "circ.inOut",
        });
      }, timeline);

      t.play();
    },
  };
});

export default useTimeLine;
