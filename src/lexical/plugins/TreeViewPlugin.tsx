import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import type { EditorState, ElementNode, GridSelection, LexicalEditor, LexicalNode, NodeSelection, RangeSelection, } from 'lexical';

import { $isMarkNode } from '@lexical/mark';
import { $getRoot, $getSelection, $isElementNode, $isGridSelection, $isRangeSelection, $isTextNode, } from 'lexical';
import { useEffect, useRef, useState } from 'react';
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { $isMathNode } from "../nodes/MathNode";

const NON_SINGLE_WIDTH_CHARS_REPLACEMENT: Readonly<Record<string, string>> =
  Object.freeze({
    '\t': '\\t',
    '\n': '\\n',
  });
const NON_SINGLE_WIDTH_CHARS_REGEX = new RegExp(
  Object.keys(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).join('|'),
  'g',
);
const SYMBOLS: Record<string, string> = Object.freeze({
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
  hasNextSibling: '├',
  isLastChild: '└',
  selectedChar: '^',
  selectedLine: '>',
});

export function TreeView({ editor, }: { editor: LexicalEditor; }): JSX.Element {
  const [timeStampedEditorStates, setTimeStampedEditorStates] = useState<Array<[number, EditorState]>>([]);
  const [content, setContent] = useState<string>('');
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const playingIndexRef = useRef(0);
  const treeElementRef = useRef<HTMLPreElement | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setContent(generateContent(editor.getEditorState()));
    return editor.registerUpdateListener(({ editorState }) => {
      const compositionKey = editor._compositionKey;
      const treeText = generateContent(editor.getEditorState());
      const compositionText =
        compositionKey !== null && `Composition key: ${compositionKey}`;
      setContent([treeText, compositionText].filter(Boolean).join('\n\n'));

      if (!timeTravelEnabled) {
        setTimeStampedEditorStates((currentEditorStates) => [
          ...currentEditorStates,
          [Date.now(), editorState],
        ]);
      }
    });
  }, [timeTravelEnabled, editor]);
  const totalEditorStates = timeStampedEditorStates.length;

  useEffect(() => {
    if (!timeTravelEnabled) {
      const totalEditorStates = timeStampedEditorStates.length;
      setSliderValue(totalEditorStates);
      const treeElement = treeElementRef.current;
      if (treeElement) {
        treeElement.scrollTop = treeElement.scrollHeight;
      }
    }
  }, [timeTravelEnabled, timeStampedEditorStates.length]);

  useEffect(() => {
    if (isPlaying) {
      let timeoutId: NodeJS.Timeout;

      const play = () => {
        const currentIndex = playingIndexRef.current;

        if (currentIndex === totalEditorStates - 1) {
          setIsPlaying(false);
          return;
        }

        const currentTime = timeStampedEditorStates[currentIndex][0];
        const nextTime = timeStampedEditorStates[currentIndex + 1][0];
        const timeDiff = nextTime - currentTime;
        timeoutId = setTimeout(() => {
          playingIndexRef.current++;
          const index = playingIndexRef.current;
          setSliderValue(index);

          editor.setEditorState(timeStampedEditorStates[index][1]);
          play();
        }, timeDiff);
      };

      play();

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [timeStampedEditorStates, isPlaying, editor, totalEditorStates]);

  useEffect(() => {
    const element = treeElementRef.current;

    if (element !== null) {
      // @ts-ignore Internal field
      element.__lexicalEditor = editor;

      return () => {
        // @ts-ignore Internal field
        element.__lexicalEditor = null;
      };
    }
  }, [editor]);

  return (
    <AppBar position="static" className="tree-view-output" sx={{ displayPrint: "none" }}>
      <pre style={{ overflow: "auto", margin: 0, padding: "1rem 0.5rem" }} ref={treeElementRef}>{content}</pre>
      {totalEditorStates > 2 &&
        <Toolbar>
          {!timeTravelEnabled && (
            <Button
              onClick={() => {
                const rootElement = editor.getRootElement();

                if (rootElement !== null) {
                  rootElement.contentEditable = 'false';
                  playingIndexRef.current = totalEditorStates - 1;
                  setTimeTravelEnabled(true);
                }
              }}
            >Time Travel</Button>
          )}
          {timeTravelEnabled && (
            <>
              <Button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                }}>
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Slider sx={{ mx: 2 }}
                onChange={(event, value) => {
                  const editorStateIndex = value as number;
                  setSliderValue(editorStateIndex);
                  const timeStampedEditorState =
                    timeStampedEditorStates[editorStateIndex];

                  if (timeStampedEditorState) {
                    playingIndexRef.current = editorStateIndex;
                    editor.setEditorState(timeStampedEditorState[1]);
                  }
                }}
                value={sliderValue}
                min={1}
                max={totalEditorStates - 1}
              />
              <Button
                onClick={() => {
                  const rootElement = editor.getRootElement();

                  if (rootElement !== null) {
                    rootElement.contentEditable = 'true';
                    const index = timeStampedEditorStates.length - 1;
                    const timeStampedEditorState = timeStampedEditorStates[index];
                    editor.setEditorState(timeStampedEditorState[1]);
                    setSliderValue(index);

                    setTimeTravelEnabled(false);
                    setIsPlaying(false);
                  }
                }}>
                Exit
              </Button>
            </>
          )}
        </Toolbar>
      }
    </AppBar>
  );
}

function printRangeSelection(selection: RangeSelection): string {
  let res = '';

  const formatText = printFormatProperties(selection);

  res += `: range ${formatText !== '' ? `{ ${formatText} }` : ''}`;

  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;

  res += `\n  ├ anchor { key: ${anchor.key}, offset: ${anchorOffset === null ? 'null' : anchorOffset
    }, type: ${anchor.type} }`;
  res += `\n  └ focus { key: ${focus.key}, offset: ${focusOffset === null ? 'null' : focusOffset
    }, type: ${focus.type} }`;

  return res;
}

function printObjectSelection(selection: NodeSelection): string {
  return `: node\n  └ [${selection.getNodes().map(n => `${n.getKey()}] ${n.getType()}`).join(', ')}`;
}

function printGridSelection(selection: GridSelection): string {
  return `: grid\n  └ { grid: ${selection.gridKey}, anchorCell: ${selection.anchor.key}, focusCell: ${selection.focus.key} }`;
}

function generateContent(editorState: EditorState): string {
  let res = ' root\n';

  const selectionString = editorState.read(() => {
    const selection = $getSelection();

    visitTree($getRoot(), (node: LexicalNode, indent: Array<string>) => {
      const nodeKey = node.getKey();
      const nodeKeyDisplay = `(${nodeKey})`;
      const typeDisplay = node.getType() || '';
      const isSelected = node.isSelected();
      const idsDisplay = $isMarkNode(node)
        ? ` id: [ ${node.getIDs().join(', ')} ] `
        : '';

      res += `${isSelected ? SYMBOLS.selectedLine : ' '} ${indent.join(
        ' ',
      )} ${nodeKeyDisplay} ${typeDisplay} ${idsDisplay} ${printNode(node)}\n`;

      res += printSelectedCharsLine({
        indent,
        isSelected,
        node,
        nodeKeyDisplay,
        selection,
        typeDisplay,
      });
    });

    return selection === null
      ? ': null'
      : $isRangeSelection(selection)
        ? printRangeSelection(selection)
        : $isGridSelection(selection)
          ? printGridSelection(selection)
          : printObjectSelection(selection);
  });

  return res + '\n selection' + selectionString;
}

function visitTree(
  currentNode: ElementNode,
  visitor: (node: LexicalNode, indentArr: Array<string>) => void,
  indent: Array<string> = [],
) {
  const childNodes = currentNode.getChildren();
  const childNodesLength = childNodes.length;

  childNodes.forEach((childNode, i) => {
    visitor(
      childNode,
      indent.concat(
        i === childNodesLength - 1
          ? SYMBOLS.isLastChild
          : SYMBOLS.hasNextSibling,
      ),
    );

    if ($isElementNode(childNode)) {
      visitTree(
        childNode,
        visitor,
        indent.concat(
          i === childNodesLength - 1
            ? SYMBOLS.ancestorIsLastChild
            : SYMBOLS.ancestorHasNextSibling,
        ),
      );
    }
  });
}

function normalize(text: string) {
  return Object.entries(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), String(value)),
    text,
  );
}

function printNode(node: LexicalNode) {
  if ($isTextNode(node)) {
    const text = node.getTextContent(true);
    const title = text.length === 0 ? '(empty)' : `"${normalize(text)}"`;
    const properties = printAllProperties(node);
    return [title, properties.length !== 0 ? `{ ${properties} }` : null]
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if ($isMathNode(node)) {
    const value = node.getValue();
    return value;
  }
  return '';
}

const FORMAT_PREDICATES = [
  (node: LexicalNode | RangeSelection) => node.hasFormat('bold') && 'Bold',
  (node: LexicalNode | RangeSelection) => node.hasFormat('code') && 'Code',
  (node: LexicalNode | RangeSelection) => node.hasFormat('italic') && 'Italic',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('strikethrough') && 'Strikethrough',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('subscript') && 'Subscript',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('superscript') && 'Superscript',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('underline') && 'Underline',
];

const DETAIL_PREDICATES = [
  (node: LexicalNode) => node.isDirectionless() && 'Directionless',
  (node: LexicalNode) => node.isUnmergeable() && 'Unmergeable',
];

const MODE_PREDICATES = [
  (node: LexicalNode) => node.isToken() && 'Token',
  (node: LexicalNode) => node.isSegmented() && 'Segmented',
  (node: LexicalNode) => node.isInert() && 'Inert',
];

function printAllProperties(node: LexicalNode) {
  return [
    printFormatProperties(node),
    printDetailProperties(node),
    printModeProperties(node),
  ]
    .filter(Boolean)
    .join(', ');
}

function printDetailProperties(nodeOrSelection: LexicalNode) {
  let str = DETAIL_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'detail: ' + str;
  }

  return str;
}

function printModeProperties(nodeOrSelection: LexicalNode) {
  let str = MODE_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'mode: ' + str;
  }

  return str;
}

function printFormatProperties(nodeOrSelection: LexicalNode | RangeSelection) {
  let str = FORMAT_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'format: ' + str;
  }

  return str;
}

function printSelectedCharsLine({
  indent,
  isSelected,
  node,
  nodeKeyDisplay,
  selection,
  typeDisplay,
}: {
  indent: Array<string>;
  isSelected: boolean;
  node: LexicalNode;
  nodeKeyDisplay: string;
  selection: GridSelection | NodeSelection | RangeSelection | null;
  typeDisplay: string;
}) {
  // No selection or node is not selected.
  if (
    !$isTextNode(node) ||
    !$isRangeSelection(selection) ||
    !isSelected ||
    $isElementNode(node)
  ) {
    return '';
  }

  // No selected characters.
  const anchor = selection.anchor;
  const focus = selection.focus;

  if (
    node.getTextContent() === '' ||
    (anchor.getNode() === selection.focus.getNode() &&
      anchor.offset === focus.offset)
  ) {
    return '';
  }

  const [start, end] = $getSelectionStartEnd(node, selection);

  if (start === end) {
    return '';
  }

  const selectionLastIndent =
    indent[indent.length - 1] === SYMBOLS.hasNextSibling
      ? SYMBOLS.ancestorHasNextSibling
      : SYMBOLS.ancestorIsLastChild;

  const indentionChars = [
    ...indent.slice(0, indent.length - 1),
    selectionLastIndent,
  ];
  const unselectedChars = Array(start + 1).fill(' ');
  const selectedChars = Array(end - start).fill(SYMBOLS.selectedChar);
  const paddingLength = typeDisplay.length + 3; // 2 for the spaces around + 1 for the double quote.

  const nodePrintSpaces = Array(nodeKeyDisplay.length + paddingLength).fill(
    ' ',
  );

  return (
    [
      SYMBOLS.selectedLine,
      indentionChars.join(' '),
      [...nodePrintSpaces, ...unselectedChars, ...selectedChars].join(''),
    ].join(' ') + '\n'
  );
}

function $getSelectionStartEnd(
  node: LexicalNode,
  selection: RangeSelection | GridSelection,
): [number, number] {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const textContent = node.getTextContent(true);
  const textLength = textContent.length;

  let start = -1;
  let end = -1;

  // Only one node is being selected.
  if (anchor.type === 'text' && focus.type === 'text') {
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

    if (
      anchorNode === focusNode &&
      node === anchorNode &&
      anchor.offset !== focus.offset
    ) {
      [start, end] =
        anchor.offset < focus.offset
          ? [anchor.offset, focus.offset]
          : [focus.offset, anchor.offset];
    } else if (node === anchorNode) {
      [start, end] = anchorNode.isBefore(focusNode)
        ? [anchor.offset, textLength]
        : [0, anchor.offset];
    } else if (node === focusNode) {
      [start, end] = focusNode.isBefore(anchorNode)
        ? [focus.offset, textLength]
        : [0, focus.offset];
    } else {
      // Node is within selection but not the anchor nor focus.
      [start, end] = [0, textLength];
    }
  }

  // Account for non-single width characters.
  const numNonSingleWidthCharBeforeSelection = (
    textContent.slice(0, start).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;
  const numNonSingleWidthCharInSelection = (
    textContent.slice(start, end).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;

  return [
    start + numNonSingleWidthCharBeforeSelection,
    end +
    numNonSingleWidthCharBeforeSelection +
    numNonSingleWidthCharInSelection,
  ];
}

export default function TreeViewPlugin() {
  const [editor] = useLexicalComposerContext();
  return <TreeView editor={editor} />;
}
