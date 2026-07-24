/**
 * GraphicsLayer
 *
 * Small presentational component that renders persisted PCB graphics and
 * the selection highlight. The component is intentionally dumb: it only
 * renders `pcb.graphics` filtered by the active `visibility` map and
 * delegates actual shape rendering to `renderShape` in `ShapesRenderer`.
 *
 * Props
 * - `pcb`: the PCB model object (expects `pcb.graphics` and related data)
 * - `visibility`: map of layer id -> visible boolean used to filter graphics
 */
import { Layer } from 'react-konva';
import SelectionHighlight from './SelectionHighlight';
import { renderShape } from './ShapesRenderer';

type Props = {
    pcb: any;
    visibility: Record<string, boolean> | undefined;
};

export default function GraphicsLayer({ pcb, visibility }: Props) {
    return (
        <Layer>
            {pcb.graphics
                ?.filter((item: any) => {
                    const layer = (item.data as unknown as { layer?: string })?.layer as string | undefined;
                    if (!layer) return true;
                    return !!visibility?.[layer];
                })
                .map(renderShape)}
            <SelectionHighlight />
        </Layer>
    );
}
