import type Konva from "konva";

export interface KeyFrame {
  id: string;
  timeStamp: number;
  animatable: {
    x?: number;
    y?: number;
    width?: number;
    scaleX?: number;
    scaleY?: number;
    height?: number;
    fill?: string;
  };
}

export interface TimeLineStore {
  keyFrames: KeyFrame[];
  timeline: gsap.core.Timeline;
  nodes: Record<string, { element: Konva.Node; keyframes: KeyFrame[] }>;
  nodesIndex: string[];
  addKeyFrame: (elementId: string, keyFrame: Omit<KeyFrame, "id">) => void;
  addNode: (node: Konva.Node, id: string) => void;
  removeNode: (id: string) => void;
  play: () => void;
}
