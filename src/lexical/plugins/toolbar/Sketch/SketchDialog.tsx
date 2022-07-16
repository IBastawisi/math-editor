import { LexicalEditor } from 'lexical';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw';
import { ExcalidrawElement, NonDeleted } from '@excalidraw/excalidraw/types/element/types';
import { AppState } from '@excalidraw/excalidraw/types/types';
import { INSERT_IMAGE_COMMAND } from '../../ImagePlugin';
import { useEffect, useState } from 'react';
import { ImageNode, ImageType } from '../../../nodes/ImageNode';
import LogicGates from "./Logic-Gates.json";
import CircuitComponents from "./circuit-components.json";
import { useTheme } from '@mui/material/styles';

export type ExcalidrawElementFragment = {
  isDeleted?: boolean;
};

export enum SketchDialogMode {
  create,
  update,
}

export default function InsertSketchDialog({ editor, node, mode, open, onClose }: { editor: LexicalEditor; node?: ImageNode; mode: SketchDialogMode; open: boolean; onClose: () => void; }) {
  const [elements, setElements] = useState<ReadonlyArray<ExcalidrawElementFragment>>([]);
  const theme = useTheme();

  const blobToBase64 = (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise<string>(resolve => {
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
    });
  };

  const handleSubmit = async () => {
    const element: SVGElement = await exportToSvg({
      appState: null as unknown as AppState,
      elements: elements as NonDeleted<ExcalidrawElement>[],
      files: null,
      exportPadding: 16,
    });

    const blob = new Blob([element.outerHTML], { type: 'image/svg+xml' });
    const src = await blobToBase64(blob);
    const value = JSON.stringify(elements);
    switch (mode) {
      case SketchDialogMode.create:
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src, data: { type: ImageType.Sketch, value } },);
        break;
      case SketchDialogMode.update:
        editor.update(() => node?.update(src, value));
        break;
    }
    onClose();
  };

  useEffect(() => {
    if (node) {
      try {
        const value = node.getData().value;
        const elements = JSON.parse(value!);
        setElements(elements);
      }
      catch (e) { }
    } else {
      setElements([{}]);
    }
  }, [node]);

  const onChange = (els: ReadonlyArray<ExcalidrawElementFragment>) => {
    setElements(els);
  };

  if (!open) return null;

  return (
    <Dialog open={open} fullScreen={true} onClose={onClose}>
      <DialogContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 0, overflow: "hidden" }}>
        <Excalidraw
          onChange={onChange}
          initialData={{
            appState: { isLoading: false },
            elements,
            libraryItems: [...LogicGates.library, ...CircuitComponents.libraryItems],
          }}
          theme={theme.palette.mode}
        />
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {mode === SketchDialogMode.create ? "Insert" : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
