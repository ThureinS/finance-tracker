import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8" aria-hidden>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>
      {[0, 1].map((section) => (
        <Card key={section} className={section === 1 ? "mt-6" : undefined}>
          <CardHeader>
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
