import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { ShapeConfig } from "konva/lib/Shape";

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
  videoDimensions: { width: number; height: number };
  setVideoDimensions: (d: { width: number; height: number }) => void;
  nodesIndex: string[];
  addKeyFrame: (elementId: string, keyFrame: Omit<KeyFrame, "id">) => void;

  selectedNodeId?: string;
  selectNode: (id: string | undefined) => void;
  addNode: (node: Konva.Node, id: string) => void;
  createNode: (...args: CreateNodeArgs) => void;
  deleteNode: (id: string) => void;
  removeNode: (id: string) => void;
  play: () => void;
}

type NodeArgs = {
  circle: void;
  square: void;
  rectangle: void;
  image: { src: string };
  text: void;
};

type NodeRecord = {
  [K in keyof NodeArgs]: {
    type: K;
    element?: Node<ShapeConfig>;
    keyframes?: KeyFrame[];
    data?: NodeArgs[K] extends void ? object : NodeArgs[K];
  };
}[keyof NodeArgs];

export type CreateNodeArgs = {
  [K in keyof NodeArgs]: NodeArgs[K] extends void ? [K] : [K, NodeArgs[K]];
}[keyof NodeArgs];
export type NodeType = keyof NodeArgs;
