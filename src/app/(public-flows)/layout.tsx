import Link from "next/link";
import { Bus } from "lucide-react";

export default function PublicFlowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="flex h-14 items-center justify-center border-b bg-background px-6">
        <Link href="/" className="flex items-center gap-2">
          <Bus className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">GroupBus</span>
        </Link>
      </header>
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">{children}</div>
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} GroupBus. All rights reserved.
      </footer>
    </div>
  );
}
