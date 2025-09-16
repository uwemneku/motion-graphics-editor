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
  // keyFrames: KeyFrame[];
  timeline: gsap.core.Timeline;
  nodes: Record<string, NodeRecord>;
  selectedKeyFrame?: KeyFrame;
  selectKeyFrame: (keyFrame: KeyFrame | undefined) => void;
  nodesIndex: string[];
  addKeyFrame: (elementId: string, keyFrame: Omit<KeyFrame, "id">) => void;

  addNode: (node: Konva.Node, id: string) => void;
  createNode: (...args: CreateNodeArgs) => void;
  removeNode: (id: string) => void;
  play: () => void;
}

type NodeArgs = {
  circle: void;
  square: void;
  rectangle: void;
  image: { src: string };
};

type NodeRecord = {
  [K in keyof NodeArgs]: {
    type: K;
    element?: Konva.Node;
    keyframes?: KeyFrame[];
    data?: NodeArgs[K] extends void ? object : NodeArgs[K];
  };
}[keyof NodeArgs];

type CreateNodeArgs = {
  [K in keyof NodeArgs]: NodeArgs[K] extends void ? [K] : [K, NodeArgs[K]];
}[keyof NodeArgs];
export type NodeType = keyof NodeArgs;
