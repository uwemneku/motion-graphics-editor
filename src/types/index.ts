export type EditorMode = "design" | "animate";
export interface AnimatableProps {
  x?: number;
  y?: number;
  width?: number;
  scaleX?: number;
  scaleY?: number;
  height?: number;
  fill?: string;
}

export interface KeyFrame {
  id: string;
  timeStamp: number;
  animatable: AnimatableProps;
}

export interface TimeLineStore {
  // keyFrames: KeyFrame[];
  timeline: gsap.core.Timeline;
  progress: number;
  isPaused: boolean;
  nodes: Record<string, NodeRecord>;
  selectedKeyFrame?: KeyFrame;
  selectKeyFrame: (keyFrame: KeyFrame | undefined) => void;
  aspectRatio: number;
  setAspectRatio(ratio: number): void;
  videoDimensions: { width: number; height: number };
  setVideoDimensions: (d: { width: number; height: number }) => void;
  nodesIndex: string[];
  addKeyFrame: (elementId: string, keyFrame: Omit<KeyFrame, "id">) => void;

  selectedNodeId?: string;
  selectNode: (id: string | undefined) => void;
  createNode: (args: CreateNodeArgs) => void;
  deleteNode: (id: string) => void;
  removeNode: (id: string) => void;
  togglePlayBack: (args?: number | "pause") => void;
}

type NodeArgs = {
  circle: void;
  square: void;
  rectangle: void;
  image: { image: string };
  text: void;
  video: { src: string };
};

export type NodeRecord = CreateNodeArgs;

export type CreateNodeArgs = {
  [K in keyof NodeArgs]: {
    type: K;
    previewImage?: string;
    keyframes?: [];
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  } & (NodeArgs[K] extends void ? {} : NodeArgs[K]);
}[keyof NodeArgs];
export type NodeType = keyof NodeArgs;
