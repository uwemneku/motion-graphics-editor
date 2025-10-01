import { useAppDispatch } from "@/app/store";
import { useRef } from "react";
import { deleteShape } from "./slice";
import {
  ShapesRecordContext,
  type IShapesRecordContext,
} from "./useShapesRecordContext";

function ShapesRecordContextProvider(props: React.PropsWithChildren) {
  const dispatch = useAppDispatch();
  const shapesRecord = useRef<IShapesRecordContext["shapesRecord"]>({}).current;

  //
  const saveShape: IShapesRecordContext["saveShape"] = (id, node) => {
    shapesRecord[id] = { node };
  };
  const _deleteShape: IShapesRecordContext["deleteShape"] = (id: string) => {
    dispatch(deleteShape(id));
    shapesRecord[id]?.node?.destroy();
    delete shapesRecord[id];
  };
  const getShape: IShapesRecordContext["getShape"] = (id: string) => {
    return shapesRecord[id]?.node;
  };
  return (
    <ShapesRecordContext.Provider
      value={{
        shapesRecord,
        saveShape,
        deleteShape: _deleteShape,
        getShape,
      }}
    >
      {props.children}
    </ShapesRecordContext.Provider>
  );
}

export default ShapesRecordContextProvider;
