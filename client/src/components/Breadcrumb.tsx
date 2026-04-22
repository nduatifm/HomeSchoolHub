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
        // Explicit current overrides position; undefined falls back to isLast
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
 * Rules:
 *  - Teacher / Student:  Classrooms → Room → [Tab] → [extra]
 *  - Parent:             My Children → Classrooms → Room → [Tab] → [extra]
 *
 * The `search` string (e.g. "?studentId=14") is threaded through the classroom-
 * level crumb only — it is NOT added to the "Classrooms" list crumb because the
 * classrooms list page doesn't filter by studentId.
 *
 * Intermediate crumbs are always explicit `current: false` so they render as
 * clickable links even if they accidentally become the last item.
 *
 * The tab crumb does NOT have an explicit current; position (isLast) determines
 * that. This means pages that call `.concat(deeperCrumb)` automatically get a
 * clickable "Assignments & Tests" / "Classwork" crumb rather than a dead span.
 */
export function buildClassroomCrumbs({
  role,
  classroomName,
  classroomHref,
  tabLabel,
  tabHref,
  search = "",
}: {
  role?: string;
  classroomName: string;
  classroomHref: string;
  tabLabel?: string;
  tabHref?: string;
  search?: string;
}): BreadcrumbCrumb[] {
  const isParent = role === "parent";
  const crumbs: BreadcrumbCrumb[] = [];

  if (isParent) {
    // "My Children" — parent's top-level home
    crumbs.push({ label: "My Children", href: "/children", current: false });
    // "Classrooms" — the parent classrooms list; no studentId since the page
    // doesn't filter by it and the param would be misleading noise
    crumbs.push({ label: "Classrooms", href: "/classrooms", current: false });
  } else {
    // Teachers and students share the same /classrooms home
    crumbs.push({ label: "Classrooms", href: "/classrooms", current: false });
  }

  // Classroom name crumb — preserve search (e.g. ?studentId) so parent context
  // survives the click back into the classroom root
  crumbs.push({
    label: classroomName,
    href: `${classroomHref}${search}`,
    // current only when there is no tab level below it
    current: !tabLabel,
  });

  if (tabLabel) {
    // No explicit current — position (isLast) decides.
    // When a page chains .concat() to add a deeper crumb, this tab crumb
    // becomes a clickable link automatically (isLast is false).
    crumbs.push({ label: tabLabel, href: tabHref });
  }

  return crumbs;
}
