"use client";

import { useEffect, useState } from "react";
import { archiveStyle } from "../../actions";

// Asks once inline instead of a browser dialog, and resets if left alone.
export function ArchiveButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-10 rounded-chip px-3 text-sm text-ink-2 hover:bg-surface-sunken hover:text-danger"
      >
        Archive
      </button>
    );
  }
  return (
    <form action={archiveStyle}>
      <input type="hidden" name="id" value={id} />
      <button
        aria-label={`Confirm archiving ${name}`}
        className="min-h-10 rounded-chip bg-danger/10 px-3 text-sm font-medium text-danger"
      >
        Confirm archive
      </button>
    </form>
  );
}
