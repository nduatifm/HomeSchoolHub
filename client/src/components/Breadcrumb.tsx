import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  current?: boolean;
  onClick?: () => void;
}

interface BreadcrumbProps {
  crumbs: BreadcrumbCrumb[];
  className?: string;
}

const SEP = (
  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" aria-hidden="true" />
);

const linkCls = "text-muted-foreground hover:text-foreground transition-colors shrink-0";
const currentCls = "text-foreground font-medium shrink-0";

export default function Breadcrumb({ crumbs, className = "" }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 flex-wrap text-sm min-w-0 ${className}`}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        const isCurrent = crumb.current ?? isLast;

        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && SEP}
            {isCurrent ? (
              <span
                aria-current="page"
                className={`${currentCls} truncate max-w-[160px] sm:max-w-[260px]`}
              >
                {crumb.label}
              </span>
            ) : crumb.onClick ? (
              <button
                type="button"
                onClick={crumb.onClick}
                className={`${linkCls} truncate max-w-[140px] sm:max-w-[240px]`}
              >
                {crumb.label}
              </button>
            ) : crumb.href ? (
              <Link
                href={crumb.href}
                className={`${linkCls} truncate max-w-[140px] sm:max-w-[240px]`}
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={`${linkCls} truncate max-w-[140px] sm:max-w-[240px]`}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Builds a classroom breadcrumb trail (all roles use the same shape).
 *
 * Trail shapes:
 *  No folder:  Classrooms → Room → [Tab] → [extra]
 *  In folder:  Classrooms → Folder → Room → [Tab] → [extra]
 *
 * Notes:
 *  - `folderName`/`folderHref` are optional; when both are provided a folder
 *    crumb is inserted between "Classrooms" and the classroom name.
 *  - `search` (e.g. "?studentId=14") is threaded into the classroom crumb so
 *    parent child-context survives navigating back to the classroom root.
 *  - Intermediate crumbs carry explicit `current: false` so they always render
 *    as links regardless of position.
 *  - The tab crumb carries no explicit `current`; position (isLast) decides.
 *    Pages that chain .concat() automatically get a clickable tab crumb.
 */
export function buildClassroomCrumbs({
  role: _role,
  classroomName,
  classroomHref,
  tabLabel,
  tabHref,
  search = "",
  folderName,
  folderHref,
}: {
  role?: string;
  classroomName: string;
  classroomHref: string;
  tabLabel?: string;
  tabHref?: string;
  search?: string;
  folderName?: string;
  folderHref?: string;
}): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [];

  crumbs.push({ label: "Classrooms", href: "/classrooms", current: false });

  // Optional folder crumb — inserted between "Classrooms" and the classroom name.
  // callers supply folderHref already including any ?studentId param for parents.
  if (folderName && folderHref) {
    crumbs.push({ label: folderName, href: folderHref, current: false });
  }

  // Classroom name crumb — thread search (e.g. ?studentId) so parent context
  // survives clicking back into the classroom root.
  crumbs.push({
    label: classroomName,
    href: `${classroomHref}${search}`,
    current: !tabLabel,
  });

  if (tabLabel) {
    // No explicit current — position (isLast) decides.
    crumbs.push({ label: tabLabel, href: tabHref });
  }

  return crumbs;
}
