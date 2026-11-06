"use client";

import { CheckCircle2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Shows once after a save, then drops the ?saved flag so a refresh doesn't repeat it.
export function SavedToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.search) router.replace(pathname, { scroll: false });
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-20 mx-auto flex max-w-sm items-center gap-2 rounded-card bg-ink px-4 py-3 text-sm text-white shadow-float md:bottom-6"
    >
      <CheckCircle2 className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
      {message}
    </div>
  );
}
