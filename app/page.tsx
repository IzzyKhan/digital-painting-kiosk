import { Suspense } from "react";
import { KioskShell } from "@/components/KioskShell";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-canvas text-ink-muted">
          Loading kiosk…
        </div>
      }
    >
      <KioskShell />
    </Suspense>
  );
}
