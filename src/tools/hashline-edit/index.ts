export { hashlineEditPlugin, hashlineEditTool } from "./plugin";
export { executeHashlineEdit } from "./handler";
export { computeLineHash, formatHashLine } from "./hash-computation";
export {
  applyHashlineEdits,
  applyRawHashlineEdits,
  parseTag,
  normalizeEdit,
  HashlineMismatchError,
} from "./edit-operations";
export type {
  HashlineEdit,
  HashlineEditToolArgs,
  HashlineApplyReport,
  Anchor,
  RawHashlineEdit,
  ReplaceLineEdit,
  ReplaceRangeEdit,
  AppendAtEdit,
  PrependAtEdit,
  AppendFileEdit,
  PrependFileEdit,
} from "./types";
