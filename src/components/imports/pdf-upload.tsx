"use client";

import { useRef, useState } from "react";
import { uploadFlightPdf } from "@/app/imports/actions";

export function PdfUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <form action={uploadFlightPdf} className="space-y-4">
      <div
        className={`rounded-3xl border-2 border-dashed p-10 text-center ${dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault(); setDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped?.type === "application/pdf") {
            setFile(dropped);
            if (inputRef.current) {
              const transfer = new DataTransfer(); transfer.items.add(dropped); inputRef.current.files = transfer.files;
            }
          }
        }}
      >
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">PDF&apos;yi buraya sürükleyin</p>
        <p className="my-3 text-sm text-slate-500 dark:text-slate-400">veya</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Dosya Seç</button>
        <input ref={inputRef} type="file" name="pdf" accept="application/pdf,.pdf" required className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <p className="mt-4 text-xs text-slate-400">Metin tabanlı PDF · en fazla 4 MB</p>
      </div>
      {file ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"><div><p className="font-medium">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p></div><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500">Yükle / Ayrıştır</button></div> : null}
    </form>
  );
}
