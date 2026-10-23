import Link from "next/link";
import { RotateCw } from "lucide-react";

// Console page title row: title, optional description, refresh link and primary action on the right.
export function PageHeader({ title, desc, refresh, action }: { title: string; desc?: React.ReactNode; refresh?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {refresh && (
            <Link href={refresh} className="grid size-7 place-items-center rounded-md text-muted hover:bg-bg-soft hover:text-fg" title="Làm mới" aria-label="Làm mới" prefetch={false}>
              <RotateCw className="size-3.5" />
            </Link>
          )}
        </div>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
