import { useAppSelector } from "@/app/store";
import { useRef, useState } from "react";
import { useCanvasWorkerContext } from "../screen/canvas-worker-context";

function LayersSideMenu() {
  const shapeIds = useAppSelector((state) => state.shapes.ids);

  return (
    <div className="">
      {shapeIds.map((e) => (
        <ShapeDetails id={e} />
      ))}
    </div>
  );
}

function ShapeDetails(props: { id: string }) {
  const canvasContext = useCanvasWorkerContext();
  const [img, setimg] = useState("");
  const shapeDetails = useAppSelector((state) => state.shapes?.data?.[props.id]);
  const hasRequestedPreviewImage = useRef(false);

  if (!hasRequestedPreviewImage.current) {
    canvasContext.app?.getShapeImage(props.id).then((e) => {
      if (e) setimg(e);
    });
    hasRequestedPreviewImage.current = true;
  }

  return (
    <div
      className="flex items-center gap-3 border-b border-b-gray-300 p-2 hover:bg-gray-400"
      onClick={() => canvasContext.app?.selectShape(props.id)}
      onMouseOver={async (e) => {
        const coordinates = await canvasContext.app?.getShapeCoordinatesByID(props.id);
        if (coordinates)
          canvasContext.highlightShape(
            coordinates?.width,
            coordinates?.height,
            coordinates?.top,
            coordinates?.left,
          );
      }}
      onMouseOut={canvasContext.clearShapeHighlight}
    >
      <img src={img} className="h-[15px] w-[15px] object-contain" />
      <p className="text-sm font-light">{shapeDetails?.type}</p>
    </div>
  );
}

export default LayersSideMenu;
