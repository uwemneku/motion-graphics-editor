import { useScreenContext } from "@/app/context/screenContext/context";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { ImageConfig } from "konva/lib/shapes/Image";
import type { Transformer } from "konva/lib/shapes/Transformer";
import { motion, useMotionValue } from "motion/react";
import {
  Fragment,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { MdDelete } from "react-icons/md";
import { Circle, Image, Rect, Text } from "react-konva";
import { Html } from "react-konva-utils";
import useImage from "use-image";
import useTimeLine from "../../hooks/useTimeLine";

interface Props {
  id: string;
  transformerRef: React.RefObject<Transformer | null>;
  stageWidth: number;
  stageHeight: number;
  videoWidth: number;
  videoHeight: number;
}
function AppShapes(props: Props) {
  const shapeDetails = useTimeLine((e) => e.nodes[props.id]);
  const addKeyFrame = useTimeLine((e) => e.addKeyFrame);
  const isSelected = useTimeLine((e) => e.selectedNodeId === props.id);
  const addNode = useTimeLine((e) => e.addNode);
  const deleteNode = useTimeLine((e) => e.deleteNode);
  const hasAddedNode = useRef(false);
  const nodeRef = useRef<Node<NodeConfig> | null>(null);
  const shapeId = props.id;
  const isImage = shapeDetails?.type === "image";
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isFirstRender = useRef(true);

  if (isFirstRender.current && nodeRef.current) {
    props.transformerRef?.current?.nodes([nodeRef.current]);
    isFirstRender.current = false;
  }

  const sharedProps: NodeConfig = {
    id: shapeId,
    y: props.stageHeight / 2 - 100,
    x: props.stageWidth / 2 - 100,
    width: 200,
    height: 200,
    stroke: "red",
    strokeWidth: isImage ? 0 : 5,
    fill: isImage ? undefined : "rgba(0,225,0,1)",
    //
    draggable: isSelected,
    isClickable: true,
    strokeScaleEnabled: false,
    //
    onClick,
    onDragEnd: handleDragEnd,
    onDragMove: handleDragMove,
    ref: handleNodeRef,
    onTransformEnd: handleTransformEnd,
  };

  function onClick(node: KonvaEventObject<MouseEvent, Node<NodeConfig>>) {
    if (node) {
      handleDragMove();
    }
  }

  function handleDragMove() {
    if (!nodeRef?.current) return;
    const _x = nodeRef?.current?.x();
    const _y = nodeRef?.current?.y();
    const _offset = nodeRef?.current?.offset();
    const height = nodeRef?.current?.height() || 0;
    console.log(nodeRef?.current?.isVisible());

    console.log("_x, _y", _x, _y, _offset);

    x.set(_x);
    y.set(_y - height / 2);
  }

  function handleNodeRef(node: Node<NodeConfig> | null) {
    if (node && !hasAddedNode.current) {
      addNode(node, shapeId);
      nodeRef.current = node;
      hasAddedNode.current = true;
    }
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent, Node<NodeConfig>>) {
    const x = e.currentTarget?.x();
    const y = e?.currentTarget?.y();
    const timeStamp = useTimeLine.getState().timeline?.time();
    addKeyFrame(shapeId, {
      animatable: {
        x,
        y,
      },
      timeStamp: timeStamp || 0,
    });
  }

  function handleTransformEnd(e: KonvaEventObject<Event, Node<NodeConfig>>) {
    const scale = e?.target?.scale();
    const width = e?.target?.width() * scale.x;
    const height = e?.target?.height() * scale.y;
  }

  let node: ReactNode = null;

  switch (shapeDetails?.type) {
    case "circle":
      node = <Circle {...sharedProps} />;
      break;
    case "square":
      node = <Rect {...sharedProps} />;
      break;
    case "text":
      sharedProps.strokeWidth = 0;
      sharedProps.width = undefined;
      sharedProps.height = undefined;
      node = <CustomText {...sharedProps} />;
      break;
    case "image":
      node = (
        <URLImage
          {...sharedProps}
          videoHeight={props.videoHeight}
          videoWidth={props.videoWidth}
          src={shapeDetails.data?.src || ""}
        />
      );
      break;
    default:
      node = null;
  }

  return (
    <Fragment>
      {isSelected && (
        <Html
          transform
          groupProps={{}}
          divProps={{ style: { zIndex: 30 } }}
          parentNodeFunc={() => {
            return document.body as HTMLDivElement;
          }}
        >
          <motion.div
            style={{ x, y }}
            className="fixed z-40 flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-md border bg-white p-2 shadow"
          >
            <MdDelete
              size={24}
              onClick={() => {
                deleteNode(shapeId);
                props?.transformerRef?.current?.nodes([]);
              }}
            />
            <motion.div className="size-6 rounded-full bg-black" />
          </motion.div>
        </Html>
      )}
      {node}
    </Fragment>
  );
}

interface URLImageProps extends Omit<ImageConfig, "image"> {
  src: string;
  ref?: (node: Node<NodeConfig> | null) => void;
  videoWidth: number;
  videoHeight: number;
}
const URLImage = ({ src, ...props }: { src: string } & URLImageProps) => {
  const [image] = useImage(src, "anonymous");
  const imageRef = useRef<Konva.Image>(null);
  const hasCenteredImage = useRef(false);

  const IMAGE_MAX_HEIGHT = props.videoHeight * 0.8;
  const height = Math.min(IMAGE_MAX_HEIGHT, image?.height || 0);
  const imageRatio = (image?.width || 0) / (image?.height || 1);
  const width = height * imageRatio;

  return (
    <Image
      image={image}
      {...props}
      width={width}
      height={height}
      ref={(node) => {
        imageRef.current = node;
        props.ref?.(node);
      }}
    />
  );
};

const CustomText = (
  props: ComponentProps<typeof Text> & {
    ref?: (node: Node<NodeConfig> | null) => void;
  },
) => {
  const [showInput, setShowInput] = useState(false);
  const textRef = useRef<Konva.Text>(null);
  const hasCenteredText = useRef(false);
  const screenContext = useScreenContext();

  if (!hasCenteredText.current && textRef.current) {
    const stageSize = screenContext?.getStageNode()?.size() || {
      width: 0,
      height: 0,
    };
    const x = (stageSize.width - textRef.current.width()) / 2;
    const y = (stageSize.height - textRef.current.height()) / 2;
    textRef.current.x(x);
    textRef.current.y(y);
    hasCenteredText.current = true;
  }

  return (
    <Text
      text="A wild text appears!"
      fontSize={20}
      {...props}
      onDblClick={(node) => {
        setShowInput(true);
        node?.currentTarget?.hide();
      }}
      ref={(node) => {
        textRef.current = node;
        props.ref?.(node);
      }}
    />
  );
};

export default AppShapes;
