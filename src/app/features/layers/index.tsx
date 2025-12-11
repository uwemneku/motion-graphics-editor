import { useAppSelector } from "@/app/store";
import { useRef, useState } from "react";
import { useCanvasWorkerContext } from "../canvas/useCanvasContext";

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
      className="flex items-center gap-3 border-b border-b-gray-300 p-2 select-none hover:bg-gray-400"
      onClick={() => canvasContext.app?.selectShape(props.id)}
      onMouseOver={async (e) => {
        canvasContext.app?.highlightShape(props.id);
      }}
      onMouseOut={canvasContext.clearShapeHighlight}
    >
      <figure className="size-5 overflow-hidden rounded-md bg-black/25 p-1">
        {/* <img src={img} className="w-full object-contain" /> */}
      </figure>
      <p className="text-sm font-light">{shapeDetails?.type}</p>
    </div>
  );
}

export default LayersSideMenu;
