import type { CreateNodeArgs } from "../../../types";

interface Data {
  REPORT_PROGRESS: { progress: number };
  EXPORT_COMPLETE: { link: string };
  EXPORT_ERROR: { error: string };
  CREATE_NODE: CreateNodeArgs;
  START_EXPORT: { id: string };
}

export type ExportWorkerMessage = {
  [K in keyof Data]: { type: K; payload: Data[K] };
}[keyof Data];
