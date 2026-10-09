import { lazy, Suspense } from "react";
import type { CKEditorNotesProps } from "./CKEditorNotesImpl";

export type { CKEditorNotesProps };

const CKEditorNotesImpl = lazy(() => import("./CKEditorNotesImpl"));

export default function CKEditorNotes(props: CKEditorNotesProps) {
    const { minHeight = 300, className = "" } = props;
    return (
        <Suspense
            fallback={
                <div
                    className={`flex items-center justify-center rounded-lg border border-[var(--app-border)] text-sm text-[var(--app-muted)] ${className}`}
                    style={{ minHeight }}
                >
                    Loading editor…
                </div>
            }
        >
            <CKEditorNotesImpl {...props} />
        </Suspense>
    );
}