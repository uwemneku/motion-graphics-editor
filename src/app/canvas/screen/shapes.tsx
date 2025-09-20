import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { ImageConfig } from "konva/lib/shapes/Image";
import type { Transformer } from "konva/lib/shapes/Transformer";
import { Circle, Image, Rect } from "react-konva";
import useImage from "use-image";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";

interface Props {
  id: string;
  transformerRef: React.RefObject<Transformer | null>;
}
function AppShapes(props: Props) {
  const shapeDetails = useTimeLine((e) => e.nodes[props.id]);
  const addKeyFrame = useTimeLine((e) => e.addKeyFrame);
  const screenContext = useScreenContext();
  const addNode = useTimeLine((e) => e.addNode);
  const shapeId = props.id;

  const sharedProps: NodeConfig = {
    id: shapeId,
    //
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    stroke: "black",
    strokeWidth: 1,
    fill: shapeDetails?.type === "image" ? undefined : "rgba(255, 255, 0, 1)",
    //
    draggable: true,
    isClickable: true,
    //
    onClick,
    onDragEnd: handleDragEnd,
    ref: handleNodeRef,
    onTransformEnd: handleTransformEnd,
  };

  function onClick(node: KonvaEventObject<MouseEvent, Node<NodeConfig>>) {
    if (node) {
      //   props.transformerRef.current?.nodes([node.currentTarget!]);
    }
  }

  function handleNodeRef(node: Node<NodeConfig> | null) {
    if (node) {
      addNode(node, shapeId);
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
      timeStamp: (screenContext?.scrubPosition.current || 0) * 10,
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
    });
  }

  switch (shapeDetails?.type) {
    case "circle":
      return <Circle {...sharedProps} />;
    case "square":
      return <Rect {...sharedProps} />;
    case "image":
      return <URLImage src={shapeDetails.data?.src || ""} {...sharedProps} />;
    default:
      return null;
  }
}

const URLImage = ({
  src,
  ...props
}: { src: string } & Omit<ImageConfig, "image">) => {
  const [image] = useImage(src, "anonymous");
  return (
    <Image
      image={image}
      {...props}
      width={image?.width}
      height={image?.height}
      ref={(node) => {
        const stage = node?.getStage();
        node?.scale({ x: 0.5, y: 0.5 });
        props.ref(node);
      }}
    />
  );
};

export default AppShapes;
