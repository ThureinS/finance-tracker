import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or may have moved.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
