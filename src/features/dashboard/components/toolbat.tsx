/**
 * Barrel export to keep existing imports working while exposing modular toolbar pieces.
 */
/* eslint-disable react-refresh/only-export-components -- file exports helpers/constants alongside components */
import ToolbarComponent from './toolbar/toolbar';
import ToolItemComponent from './toolbar/toolbar-item';

export type {
  ToolbarAttachment,
  ToolbarOrientation,
  ToolItemDescriptor,
  ToolItemProps,
  ToolItemRenderProps,
  ToolbarProps,
} from './toolbar/types';

export { orientationByAnchor } from './toolbar/toolbar';

const Toolbar = ToolbarComponent;
const ToolItem = ToolItemComponent;

export { Toolbar, ToolItem };
export default Toolbar;
