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
    crumbs.push({ label: "My Children", href: "/children" });
    crumbs.push({ label: "Classrooms", href: `/classrooms${search}` });
  } else {
    crumbs.push({ label: "Classrooms", href: "/classrooms" });
  }

  crumbs.push({
    label: classroomName,
    href: `${classroomHref}${search}`,
    current: !tabLabel,
  });

  if (tabLabel) {
    crumbs.push({ label: tabLabel, href: tabHref, current: true });
  }

  return crumbs;
}
