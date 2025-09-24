import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { ImageConfig } from "konva/lib/shapes/Image";
import type { Transformer } from "konva/lib/shapes/Transformer";
import { useRef } from "react";
import { Circle, Image, Rect } from "react-konva";
import useImage from "use-image";
import { useScreenContext } from "../../context/screenContext/context";
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
  const screenContext = useScreenContext();
  const addNode = useTimeLine((e) => e.addNode);
  const hasAddedNode = useRef(false);
  const shapeId = props.id;
  const isImage = shapeDetails?.type === "image";

  const sharedProps = {
    id: shapeId,
    y: props.stageHeight / 4 - 50,
    x: props.stageWidth / 2,
    width: 50,
    height: 50,
    stroke: "black",
    strokeWidth: isImage ? 0 : 1,
    fill: isImage ? undefined : "rgba(86, 86, 86, 1)",
    //
    draggable: true,
    isClickable: true,
    strokeScaleEnabled: true,
    //
    onClick,
    onDragEnd: handleDragEnd,
    ref: handleNodeRef,
    onTransformEnd: handleTransformEnd,
  } satisfies NodeConfig;

  function onClick(node: KonvaEventObject<MouseEvent, Node<NodeConfig>>) {
    if (node) {
      console.log({ node });

      //   props.transformerRef.current?.nodes([node.currentTarget!]);
    }
  }

  function handleNodeRef(node: Node<NodeConfig> | null) {
    if (node && !hasAddedNode.current) {
      addNode(node, shapeId);
      hasAddedNode.current = true;
    }
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent, Node<NodeConfig>>) {
    const x = e.currentTarget?.x();
    const y = e?.currentTarget?.y();

    addKeyFrame(shapeId, {
      animatable: {
        x,
        y,
      },
      timeStamp: screenContext?.scrubPosition.current || 0,
    });
  }

  function handleTransformEnd(e: KonvaEventObject<Event, Node<NodeConfig>>) {
    const scale = e?.target?.scale();
    const width = e?.target?.width() * scale.x;
    const height = e?.target?.height() * scale.y;
    e.target.setAttrs({
      width,
      height,
      scale: { x: 1, y: 1 },
      x: e.target.x(),
      y: e.target.y(),
    });
  }

  switch (shapeDetails?.type) {
    case "circle":
      return <Circle {...sharedProps} />;
    case "square":
      return (
        <Rect
          {...sharedProps}

          // offsetX={sharedProps.width / 2}
          // offsetY={sharedProps.height / 2}
        />
      );
    case "image":
      return (
        <URLImage
          {...sharedProps}
          videoHeight={props.videoHeight}
          videoWidth={props.videoWidth}
          src={shapeDetails.data?.src || ""}
        />
      );
    default:
      return null;
  }
}

interface URLImageProps extends Omit<ImageConfig, "image"> {
  src: string;
  ref?: (node: Node<NodeConfig> | null) => void;
  videoWidth: number;
  videoHeight: number;
}
const URLImage = ({ src, ...props }: { src: string } & URLImageProps) => {
  const [image] = useImage(src, "anonymous");
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
        props.ref?.(node);
      }}
    />
  );
};

export default AppShapes;
