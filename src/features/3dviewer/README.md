3D Viewer Modal
================

Usage example for the `Modal` component shipped in `src/features/3dviewer/components`.

```tsx
import React, { useState } from 'react';
import { Modal } from '@/features/3dviewer/components';

export default function Example() {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <label className="ml-2">
        <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} /> Fullscreen
      </label>

      <Modal isOpen={open} onClose={() => setOpen(false)} fullScreen={full} title="3D Viewer">
        <div style={{minHeight:200}}>Place your 3D viewer content here.</div>
      </Modal>
    </div>
  );
}
```

Notes:
- Uses the project Tailwind theme (same palette used in PCB editor toolbars).
- Close the modal by clicking the close button or backdrop.
