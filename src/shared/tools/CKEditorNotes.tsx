import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useRef } from "react";
import {
    DecoupledEditor,
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Strikethrough,
    RemoveFormat,
    List,
    Indent,
    IndentBlock,
    BlockQuote,
    Link,
    Bookmark,
    Table,
    TableToolbar,
    TableProperties,
    TableCellProperties,
    ShowBlocks,
    SpecialCharacters,
    SpecialCharactersEssentials,
    SourceEditing,
    Style,
    GeneralHtmlSupport,
    Fullscreen,
    PasteFromOffice,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const CKEDITOR_LICENSE_KEY = "GPL";

const EDITOR_CONFIG = {
    licenseKey: CKEDITOR_LICENSE_KEY,
    plugins: [
        Essentials,
        Paragraph,
        Heading,
        Bold,
        Italic,
        Strikethrough,
        RemoveFormat,
        List,
        Indent,
        IndentBlock,
        BlockQuote,
        Link,
        Bookmark,
        Table,
        TableToolbar,
        TableProperties,
        TableCellProperties,
        ShowBlocks,
        SpecialCharacters,
        SpecialCharactersEssentials,
        SourceEditing,
        Style,
        GeneralHtmlSupport,
        Fullscreen,
        PasteFromOffice,
    ],
    toolbar: {
        items: [
            "undo", "redo", "|",
            "link", "bookmark", "|",
            "insertTable", "|",
            "showBlocks", "|",
            "specialCharacters", "|",
            "fullscreen", "|",
            "sourceEditing", "|",
            "bold", "italic", "strikethrough", "removeFormat", "|",
            "numberedList", "bulletedList", "|",
            "outdent", "indent", "|",
            "blockQuote", "|",
            "style", "|",
            "heading",
        ],
        shouldNotGroupWhenFull: true,
    },
    table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells", "tableProperties", "tableCellProperties"],
    },
    style: {
        definitions: [
            { name: "Highlighted", element: "span", classes: ["highlight"] },
            { name: "Info box", element: "p", classes: ["info-box"] },
        ],
    },
};

export interface CKEditorNotesProps {
    value: string;
    onChange: (value: string) => void;
    minHeight?: number;
    className?: string;
    stickyTopOffset?: number;
}

export default function CKEditorNotes({
    value,
    onChange,
    minHeight = 300,
    className = "",
    stickyTopOffset = 0,
}: CKEditorNotesProps) {
    const toolbarHostRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className={`ckeditor-notes ${className}`}
            style={{
                ["--ckeditor-notes-min-height" as any]: `${minHeight}px`,
                ["--ckeditor-notes-sticky-top" as any]: `${stickyTopOffset}px`,
            }}
        >
            <style>{`
                .ckeditor-notes-toolbar-host {
                    position: sticky;
                    top: var(--ckeditor-notes-sticky-top, 0px);
                    z-index: 20;
                    background: #fff;
                    border: 1px solid #cbd5e1;
                    border-top-left-radius: 0.5rem;
                    border-top-right-radius: 0.5rem;
                }
                .ckeditor-notes-toolbar-host .ck.ck-toolbar {
                    border: none;
                    border-radius: 0.5rem;
                }
                .ckeditor-notes-editable-wrap {
                    border: 1px solid #cbd5e1;
                    border-top: none;
                    border-bottom-left-radius: 0.5rem;
                    border-bottom-right-radius: 0.5rem;
                    overflow: hidden;
                }
                .ckeditor-notes .ck-editor__editable_inline {
                    min-height: var(--ckeditor-notes-min-height, 300px);
                }
                .ckeditor-notes .ck-content .highlight {
                    background-color: #fef08a;
                    padding: 0 2px;
                }
                .ckeditor-notes .ck-content .info-box {
                    background-color: #eff6ff;
                    border-left: 3px solid #3b82f6;
                    padding: 8px 12px;
                    margin: 8px 0;
                }
            `}</style>

            <div ref={toolbarHostRef} className="ckeditor-notes-toolbar-host" />

            <div className="ckeditor-notes-editable-wrap">
                <CKEditor
                    editor={DecoupledEditor}
                    data={value}
                    config={EDITOR_CONFIG}
                    onReady={(editor) => {
                        const toolbarEl = editor.ui.view.toolbar.element as HTMLElement | null;
                        if (toolbarEl && toolbarHostRef.current) {
                            toolbarHostRef.current.innerHTML = "";
                            toolbarHostRef.current.appendChild(toolbarEl);
                        }
                    }}
                    onChange={(_event, editor) => onChange(editor.getData())}
                />
            </div>
        </div>
    );
}