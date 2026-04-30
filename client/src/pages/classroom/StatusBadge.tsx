export default function StatusBadge({
  status,
  grade,
  points,
}: {
  status: string;
  grade?: number | null;
  points?: number;
}) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    late: "bg-amber-100 text-amber-800",
    graded: "bg-green-100 text-green-700",
    returned: "bg-orange-100 text-orange-700",
    "not-submitted": "bg-gray-100 text-gray-500",
  };

  let label: string;
  if (status === "not-submitted") {
    label = "Not submitted";
  } else if (status === "graded" && grade !== null && grade !== undefined && points !== undefined) {
    label = `Graded — ${grade}/${points} pts`;
  } else {
    label = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
}
