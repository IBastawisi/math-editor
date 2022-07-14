import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { LexicalEditor, } from "lexical";
import { ImageNode, ImageNodeType } from "../../nodes/ImageNode";

import { SxProps, Theme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import GraphDialog, { DialogMode as GraphDialogMode } from './GraphDialog';
import SketchDialog, { DialogMode as SketchDialogMode } from './SketcDialog';
import { useState } from "react";


export default function ImageTools({ editor, node, sx }: { editor: LexicalEditor, node: ImageNode, sx?: SxProps<Theme> | undefined }): JSX.Element {
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [sketchDialogOpen, setSketchDialogOpen] = useState(false);
  const data = node.getData();
  return (
    <>
      <ToggleButtonGroup size="small" sx={{ ...sx }} >
        {data.type === ImageNodeType.Graph &&
          <ToggleButton value="edit"
            onClick={() => { setGraphDialogOpen(true) }}>
            <EditIcon />
          </ToggleButton>
        }
        {data.type === ImageNodeType.Sketch &&
          <ToggleButton value="edit"
            onClick={() => { setSketchDialogOpen(true) }}>
            <EditIcon />
          </ToggleButton>
        }
      </ToggleButtonGroup>
      <GraphDialog editor={editor} node={node} mode={GraphDialogMode.update} open={graphDialogOpen} onClose={() => setGraphDialogOpen(false)} />
      <SketchDialog editor={editor} node={node} mode={SketchDialogMode.update} open={sketchDialogOpen} onClose={() => setSketchDialogOpen(false)} />
    </>
  )
}