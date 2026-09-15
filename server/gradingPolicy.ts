export type GradingCategorySnapshot = {
  id: number;
  key: string;
  name: string;
  weight: number;
  displayOrder: number;
  active: boolean;
};

export type GradingPolicyForSelection = {
  id: number;
  effectiveFrom: Date | string;
  categorySnapshot?: unknown;
  assignmentWeight: number;
  testWeight: number;
  quizWeight: number;
  projectWeight: number;
};

export type CategorySnapshotPayload = {
  version: number;
  legacy: boolean;
  categories: GradingCategorySnapshot[];
};

const legacyKeys = ["assignment", "test", "quiz", "project"] as const;
export type LegacyAssignmentType = (typeof legacyKeys)[number];

export function normalizeLegacyAssignmentType(value: unknown): LegacyAssignmentType {
  return legacyKeys.includes(value as LegacyAssignmentType)
    ? (value as LegacyAssignmentType)
    : "assignment";
}

export function buildCategorySnapshot(
  categories: Array<{
    id: number;
    key: string;
    name: string;
    weight: number;
    displayOrder: number;
    active: boolean;
  }>,
  legacyWeights?: Partial<Record<(typeof legacyKeys)[number], number>>,
): GradingCategorySnapshot[] {
  return [...categories]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .map((category) => ({
      id: category.id,
      key: category.key,
      name: category.name,
      weight:
        legacyWeights && legacyKeys.includes(category.key as (typeof legacyKeys)[number])
          ? legacyWeights[category.key as (typeof legacyKeys)[number]] ??
            category.weight
          : category.weight,
      displayOrder: category.displayOrder,
      active: category.active,
    }));
}

export function parseCategorySnapshot(value: unknown): GradingCategorySnapshot[] | null {
  const rawCategories = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        Array.isArray((value as any).categories)
      ? (value as any).categories
      : null;
  if (!rawCategories) return null;
  const categories = rawCategories.filter(
    (category: unknown): category is GradingCategorySnapshot =>
      !!category &&
      typeof category === "object" &&
      Number.isInteger((category as any).id) &&
      typeof (category as any).key === "string" &&
      typeof (category as any).name === "string" &&
      typeof (category as any).weight === "number" &&
      typeof (category as any).displayOrder === "number" &&
      typeof (category as any).active === "boolean",
  );
  return categories.length === rawCategories.length ? categories : null;
}

export function buildCategorySnapshotPayload(
  categories: Array<{
    id: number;
    key: string;
    name: string;
    weight: number;
    displayOrder: number;
    active: boolean;
  }>,
): CategorySnapshotPayload {
  return {
    version: 2,
    legacy: false,
    categories: buildCategorySnapshot(categories),
  };
}

export function isLegacyPolicySnapshot(value: unknown): boolean {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as any).legacy === true
  ) {
    return true;
  }
  // Arrays were used briefly before the explicit payload marker was added.
  // Treat only an exact baseline four-bucket array as legacy.
  if (!Array.isArray(value) || value.length !== legacyKeys.length) return false;
  return legacyKeys.every((key) => value.some((entry: any) => entry?.key === key));
}

/** Normalize the historical marker without changing any saved bucket data. */
export function activateLegacySnapshot(
  value: unknown,
): CategorySnapshotPayload | null {
  if (!isLegacyPolicySnapshot(value) || !value || typeof value !== "object") {
    return null;
  }
  const categories = parseCategorySnapshot(value);
  if (!categories) return null;
  return {
    version: Number((value as any).version) || 1,
    legacy: true,
    categories: categories.map((category) => ({ ...category, active: true })),
  };
}

export function utcEndOfDay(dateTo: string): Date {
  return new Date(`${dateTo.slice(0, 10)}T23:59:59.999Z`);
}

export type AssignmentCategoryHistoryRow = {
  id?: number;
  categoryId: number | null;
  legacyType: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
};

/**
 * A history row is authoritative even when its categoryId is null. The
 * current assignment category is used only when there is no history at all.
 */
export function resolveAssignmentCategoryAtDate(
  history: AssignmentCategoryHistoryRow[],
  dateTo: string,
  fallbackCategoryId: number | null,
  fallbackAssignmentType: string,
): { categoryId: number | null; assignmentType: LegacyAssignmentType } {
  if (history.length === 0) {
    return {
      categoryId: fallbackCategoryId,
      assignmentType: normalizeLegacyAssignmentType(fallbackAssignmentType),
    };
  }

  const boundary = utcEndOfDay(dateTo).getTime();
  const row = [...history]
    .filter((item) => {
      const from = new Date(item.effectiveFrom).getTime();
      const to = item.effectiveTo == null ? Infinity : new Date(item.effectiveTo).getTime();
      return from <= boundary && to > boundary;
    })
    .sort(
      (a, b) =>
        new Date(b.effectiveFrom).getTime() -
          new Date(a.effectiveFrom).getTime() ||
        (b.id ?? 0) - (a.id ?? 0),
    )[0];
  return row
    ? {
        categoryId: row.categoryId,
        assignmentType: normalizeLegacyAssignmentType(row.legacyType),
      }
    : {
        categoryId: null,
        assignmentType: "assignment",
      };
}

// Backward-compatible export name for callers from the first history
// implementation; the result now includes both historical identity fields.
export const resolveAssignmentCategoryIdAtDate = resolveAssignmentCategoryAtDate;

export function snapshotCategoryMatchesAssignment(
  category: GradingCategorySnapshot,
  historicalCategoryId: number | null,
  historicalAssignmentType: string,
  legacySnapshot: boolean,
): boolean {
  if (legacySnapshot) {
    return category.key === normalizeLegacyAssignmentType(historicalAssignmentType);
  }
  return category.id === historicalCategoryId;
}

function policyDate(policy: GradingPolicyForSelection): number {
  return new Date(policy.effectiveFrom).getTime();
}

/** Select the policy in effect at the end of the report's UTC calendar date. */
export function selectPolicyForDate<T extends GradingPolicyForSelection>(
  policies: T[],
  dateTo: string,
): T | null {
  if (policies.length === 0) return null;
  const utcCalendarDate = dateTo.slice(0, 10);
  const endOfUtcDate = new Date(`${utcCalendarDate}T23:59:59.999Z`).getTime();
  const descending = [...policies].sort(
    (a, b) => policyDate(b) - policyDate(a) || b.id - a.id,
  );
  return descending.find((policy) => policyDate(policy) <= endOfUtcDate) ?? null;
}

export function defaultCategorySnapshot(
  legacyWeights: Record<string, number> = {
    assignment: 25,
    test: 25,
    quiz: 25,
    project: 25,
  },
): GradingCategorySnapshot[] {
  return legacyKeys.map((key, displayOrder) => ({
    id: 0,
    key,
    name: `${key[0].toUpperCase()}${key.slice(1)}s`,
    weight: legacyWeights[key],
    displayOrder,
    active: true,
  }));
}