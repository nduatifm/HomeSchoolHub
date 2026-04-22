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
 * Builds a role-aware classroom breadcrumb trail.
 *
 * Trail shapes:
 *  Teacher / Student (no folder):  Classrooms → Room → [Tab] → [extra]
 *  Teacher / Student (in folder):  Classrooms → Folder → Room → [Tab] → [extra]
 *  Parent (no folder):             My Children → Classrooms → Room → [Tab] → [extra]
 *  Parent (in folder):             My Children → Classrooms → Folder → Room → [Tab] → [extra]
 *
 * Notes:
 *  - `search` (e.g. "?studentId=14") is applied to the classroom crumb and the
 *    folder crumb (for parents) so the parent's child-context survives navigation.
 *  - The folder crumb is only emitted when both `folderName` and `folderHref` are
 *    provided — callers are responsible for computing the href (including ?studentId).
 *  - Intermediate crumbs carry explicit `current: false` so they always render as
 *    links regardless of position.
 *  - The tab crumb carries no explicit `current`; position (isLast) decides. Pages
 *    that chain .concat() automatically get a clickable tab crumb rather than a span.
 */
export function buildClassroomCrumbs({
  role,
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
  const isParent = role === "parent";
  const crumbs: BreadcrumbCrumb[] = [];

  if (isParent) {
    crumbs.push({ label: "My Children", href: "/children", current: false });
    crumbs.push({ label: "Classrooms", href: "/classrooms", current: false });
  } else {
    crumbs.push({ label: "Classrooms", href: "/classrooms", current: false });
  }

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
