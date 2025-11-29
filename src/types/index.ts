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
