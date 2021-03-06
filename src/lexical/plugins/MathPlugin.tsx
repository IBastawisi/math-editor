/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

 import {$createNodeSelection, $setSelection, LexicalCommand} from 'lexical';
 
 import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
 import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
 import {useEffect} from 'react';
 
 import {$createMathNode, MathNode} from '../nodes/MathNode';
 
 type CommandPayload = {
   value: string;
 };
 
 export const INSERT_MATH_COMMAND: LexicalCommand<CommandPayload> =
   createCommand();
 
 export default function MathPlugin(): JSX.Element | null {
   const [editor] = useLexicalComposerContext();
 
   useEffect(() => {
     if (!editor.hasNodes([MathNode])) {
       throw new Error(
         'MathPlugin: MathNode not registered on editor',
       );
     }
 
     return editor.registerCommand<CommandPayload>(
       INSERT_MATH_COMMAND,
       (payload) => {
         const { value } = payload;
         const selection = $getSelection();
         if ($isRangeSelection(selection)) {
           const mathNode = $createMathNode(value);
           selection.insertNodes([mathNode]);
           const nodeSelection = $createNodeSelection();
           nodeSelection.add(mathNode.getKey());
           $setSelection(nodeSelection);
         }
         return true;
       },
       COMMAND_PRIORITY_EDITOR,
     );
   }, [editor]);
 
   return null;
 }
 