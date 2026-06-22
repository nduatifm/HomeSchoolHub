import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import ModernSidebar from "@/components/ModernSidebar";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Clock,
  Repeat,
  Star,
  BookOpen,
  Dumbbell,
  Home,
  Users,
  Link,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannerTask {
  id: number;
  studentId: number;
  createdByUserId: number;
  title: string;
  category: "chore" | "school" | "reading" | "activity";
  startDate: string;
  time?: string | null;
  note?: string | null;
  reward?: string | null;
  repeat: "once" | "daily" | "weekdays" | "weekly";
  createdAt: string;
  completions: { id: number; taskId: number; studentId: number; date: string; completedAt: string }[];
}

interface ChildInfo {
  id: number;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  chore:    { label: "Chore",    color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: <Home className="w-3.5 h-3.5" /> },
  school:   { label: "School",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: <BookOpen className="w-3.5 h-3.5" /> },
  reading:  { label: "Reading",  color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <BookOpen className="w-3.5 h-3.5" /> },
  activity: { label: "Activity", color: "text-green-700",  bg: "bg-green-50 border-green-200",   icon: <Dumbbell className="w-3.5 h-3.5" /> },
};

const REPEAT_LABELS: Record<string, string> = {
  once: "Once",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
};

const REWARD_STARS: Record<string, number> = {
  "": 0, "1star": 1, "2stars": 2, "3stars": 3,
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return toDateStr(new Date()); }
function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isToday(dateStr: string) { return dateStr === todayStr(); }

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarBadge({ reward }: { reward?: string | null }) {
  const count = REWARD_STARS[reward ?? ""] ?? 0;
  if (!count) return null;
  return (
    <span className="flex items-center gap-0.5 text-amber-500 text-xs font-semibold">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  selected,
  onSelect,
  monthSummary,
}: {
  selected: string;
  onSelect: (d: string) => void;
  monthSummary: Record<string, { total: number; done: number }>;
}) {
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const d = new Date(selected + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const { year, month } = view;
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const d = new Date(year, month - 2, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() + 1 });
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const d = new Date(year, month, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() + 1 });
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="grid grid-cols-7 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const isSelected = dateStr === selected;
            const isToday_ = dateStr === todayStr();
            const summary = monthSummary[dateStr];
            const hasTasks = !!summary && summary.total > 0;
            const allDone = hasTasks && summary.done === summary.total;

            return (
              <button
                key={i}
                onClick={() => onSelect(dateStr)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-md text-xs font-medium transition-colors relative
                  ${isSelected && !isToday_ ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : ""}
                  ${isToday_ ? "bg-blue-600 text-white font-bold" : ""}
                  ${!isSelected && !isToday_ ? "text-gray-600 hover:bg-gray-100" : ""}
                `}
              >
                {day}
                {hasTasks && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${allDone ? "bg-green-500" : isToday_ ? "bg-white" : "bg-blue-500"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Has tasks
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> All done
        </span>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  date,
  studentId,
  canDelete,
  isStudent,
}: {
  task: PlannerTask;
  date: string;
  studentId: number;
  canDelete: boolean;
  isStudent: boolean;
}) {
  const queryClient = useQueryClient();
  const isDone = task.completions.some((c) => c.date === date);
  const meta = CATEGORY_META[task.category] ?? CATEGORY_META.chore;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (isDone) {
        await apiRequest(`/api/planner/students/${studentId}/tasks/${task.id}/complete`, {
          method: "DELETE",
          body: JSON.stringify({ date }),
        });
      } else {
        await apiRequest(`/api/planner/students/${studentId}/tasks/${task.id}/complete`, {
          method: "POST",
          body: JSON.stringify({ date }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner/students", studentId, "day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/planner/students", studentId, "month"] });
    },
    onError: () => toast({ title: "Couldn't update task — try again.", type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/planner/students/${studentId}/tasks/${task.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner/students", studentId, "day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/planner/students", studentId, "month"] });
      toast({ title: "Task removed" });
    },
    onError: () => toast({ title: "Couldn't remove task — try again.", type: "error" }),
  });

  return (
    <div className={`bg-white border rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm transition-all hover:shadow-md ${isDone ? "opacity-60" : ""}`}>
      {/* Checkbox — only students can check off */}
      {isStudent ? (
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400 hover:bg-green-50"
          }`}
        >
          {isDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </button>
      ) : (
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 ${isDone ? "bg-green-500 border-green-500" : "border-gray-200"}`}>
          {isDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-gray-800 ${isDone ? "line-through text-gray-400" : ""}`}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${meta.bg} ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {task.time && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" /> {task.time}
            </span>
          )}
          {task.repeat !== "once" && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Repeat className="w-3 h-3" /> {REPEAT_LABELS[task.repeat]}
            </span>
          )}
          <StarBadge reward={task.reward} />
        </div>
        {task.note && <p className="text-xs text-gray-500 mt-1 italic">{task.note}</p>}
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

// ─── Add Task Dialog ──────────────────────────────────────────────────────────
function AddTaskDialog({
  open,
  onClose,
  defaultDate,
  defaultStudentId,
  children,
  isStudent,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultStudentId: number;
  children: ChildInfo[];
  isStudent: boolean;
  userId: number;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(isStudent ? "school" : "chore");
  const [startDate, setStartDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [reward, setReward] = useState("");
  const [repeat, setRepeat] = useState("once");
  const [selectedChildren, setSelectedChildren] = useState<number[]>(
    defaultStudentId ? [defaultStudentId] : [],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const targets = isStudent ? [defaultStudentId] : selectedChildren;
      await Promise.all(
        targets.map((sid) =>
          apiRequest(`/api/planner/students/${sid}/tasks`, {
            method: "POST",
            body: JSON.stringify({
              title: title.trim(),
              category,
              startDate,
              time: time || null,
              note: note || null,
              reward: reward || null,
              repeat,
            }),
          }),
        ),
      );
    },
    onSuccess: () => {
      const targets = isStudent ? [defaultStudentId] : selectedChildren;
      targets.forEach((sid) => {
        queryClient.invalidateQueries({ queryKey: ["/api/planner/students", sid, "day"] });
        queryClient.invalidateQueries({ queryKey: ["/api/planner/students", sid, "month"] });
      });
      toast({ title: "Task added!" });
      onClose();
      setTitle("");
      setCategory(isStudent ? "school" : "chore");
      setStartDate(defaultDate);
      setTime("");
      setNote("");
      setReward("");
      setRepeat("once");
    },
    onError: (e: any) => toast({ title: e?.message || "Couldn't add task — try again.", type: "error" }),
  });

  const toggleChild = (id: number) =>
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canSubmit = title.trim().length > 0 && (isStudent || selectedChildren.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Add Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task</Label>
            <Input
              id="task-title"
              className="mt-1"
              placeholder="e.g. Clean your room"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && createMutation.mutate()}
              autoFocus
            />
          </div>

          {/* Multi-child picker — parent only */}
          {!isStudent && children.length > 1 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">For</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChildren(children.map((c) => c.id))}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  All children
                </button>
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChild(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedChildren.includes(c.id)
                        ? "bg-primary text-white border-primary"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isStudent ? ["school", "reading"] : ["chore", "school", "reading", "activity"]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start date</Label>
              <Input
                type="date"
                className="mt-1 h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time + Repeat row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Time (optional)</Label>
              <Input
                type="time"
                className="mt-1 h-9"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Repeat</Label>
              <Select value={repeat} onValueChange={setRepeat}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reward — parent only */}
          {!isStudent && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reward (optional)</Label>
              <Select value={reward} onValueChange={setReward}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="No reward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No reward</SelectItem>
                  <SelectItem value="1star">⭐ 1 Star</SelectItem>
                  <SelectItem value="2stars">⭐⭐ 2 Stars</SelectItem>
                  <SelectItem value="3stars">⭐⭐⭐ 3 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Note (optional)</Label>
            <Textarea
              className="mt-1 text-sm resize-none"
              placeholder="Any extra details…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Day View (for a single student) ─────────────────────────────────────────
function StudentDayView({
  studentId,
  studentName,
  date,
  isStudent,
  currentUserId,
}: {
  studentId: number;
  studentName: string;
  date: string;
  isStudent: boolean;
  currentUserId: number;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery<PlannerTask[]>({
    queryKey: ["/api/planner/students", studentId, "day", date],
    queryFn: () =>
      apiRequest(`/api/planner/students/${studentId}/day?date=${date}`),
  });

  const grouped = useMemo(() => {
    const g: Record<string, PlannerTask[]> = {};
    for (const t of tasks) {
      if (!g[t.category]) g[t.category] = [];
      g[t.category].push(t);
    }
    return g;
  }, [tasks]);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completions.some((c) => c.date === date)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-500">Daily progress</span>
            <span className="font-semibold text-green-600">{done} of {total} done</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks by category */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center border border-dashed border-gray-200 rounded-xl">
          <CalendarDays className="w-10 h-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No tasks for this day</p>
          <p className="text-xs text-gray-400 max-w-[200px]">
            {isStudent ? "Add your own school or reading reminders below." : `Add tasks for ${studentName} with the + button above.`}
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add task
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, catTasks]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${CATEGORY_META[cat]?.color ?? "text-gray-500"}`}>
                  {CATEGORY_META[cat]?.icon}
                  {CATEGORY_META[cat]?.label ?? cat}
                </span>
                <span className="text-xs text-gray-300">{catTasks.length}</span>
              </div>
              <div className="space-y-2">
                {catTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    date={date}
                    studentId={studentId}
                    isStudent={isStudent}
                    canDelete={isStudent ? task.createdByUserId === currentUserId : true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={date}
        defaultStudentId={studentId}
        children={[{ id: studentId, name: studentName }]}
        isStudent={isStudent}
        userId={currentUserId}
      />
    </div>
  );
}

// ─── Parent family overview ───────────────────────────────────────────────────
function ParentFamilyView({
  date,
  currentUserId,
}: {
  date: string;
  currentUserId: number;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery<{ children: ChildInfo[]; tasks: Record<number, PlannerTask[]> }>({
    queryKey: ["/api/planner/family/day", date],
    queryFn: () => apiRequest(`/api/planner/family/day?date=${date}`),
  });

  const children = data?.children ?? [];
  const tasksByChild = data?.tasks ?? {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Users className="w-12 h-12 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">No children linked yet</p>
        <p className="text-xs text-gray-400">Invite a student from the Invite Student page first.</p>
        <Button size="sm" variant="outline" onClick={() => (window.location.href = "/invites")}>
          <Link className="w-3.5 h-3.5 mr-1.5" /> Go to Invites
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {children.map((child) => {
        const tasks: PlannerTask[] = tasksByChild[child.id] ?? [];
        const total = tasks.length;
        const done = tasks.filter((t) => t.completions.some((c) => c.date === date)).length;
        return (
          <div key={child.id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{child.name}</h3>
              <span className="text-xs text-gray-400">{done}/{total} done</span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No tasks for this day</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    date={date}
                    studentId={child.id}
                    isStudent={false}
                    canDelete={true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={date}
        defaultStudentId={children[0]?.id ?? 0}
        children={children}
        isStudent={false}
        userId={currentUserId}
      />

      {/* Floating add */}
      <div className="fixed bottom-8 right-8">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-12 px-5"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Task
        </Button>
      </div>
    </div>
  );
}

// ─── Month summary hook (per-student) ────────────────────────────────────────
function useMonthSummary(studentId: number | null, year: number, month: number) {
  return useQuery<Record<string, { total: number; done: number }>>({
    queryKey: ["/api/planner/students", studentId, "month", year, month],
    queryFn: () =>
      apiRequest(`/api/planner/students/${studentId}/month?year=${year}&month=${month}`),
    enabled: !!studentId,
  });
}

// ─── Parent child selector ────────────────────────────────────────────────────
function ParentChildSelector({
  children,
  selected,
  onSelect,
}: {
  children: ChildInfo[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  if (children.length <= 1) return null;
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {children.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            selected === c.id
              ? "bg-primary text-white border-primary"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const { user } = useAuth();
  const isParent = user?.role === "parent";
  const isStudent = user?.role === "student";

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Parent: fetch children list
  const { data: familyData } = useQuery<{ children: ChildInfo[]; tasks: Record<number, PlannerTask[]> }>({
    queryKey: ["/api/planner/family/day", selectedDate],
    queryFn: () => apiRequest(`/api/planner/family/day?date=${selectedDate}`),
    enabled: isParent,
  });
  const children = familyData?.children ?? [];

  // Resolve the active student id
  const activeChildId = useMemo(() => {
    if (!isParent) return null;
    if (selectedChildId && children.some((c) => c.id === selectedChildId)) return selectedChildId;
    return children[0]?.id ?? null;
  }, [isParent, selectedChildId, children]);

  // Student: fetch own student record
  const { data: myStudent } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: isStudent,
  });

  const plannerStudentId = isParent ? activeChildId : myStudent?.id ?? null;

  // Month summary for calendar dots
  const { data: monthSummary = {} } = useMonthSummary(plannerStudentId, viewYear, viewMonth);

  // Update viewYear/viewMonth when selectedDate changes
  const handleSelectDate = (d: string) => {
    setSelectedDate(d);
    const dObj = new Date(d + "T00:00:00");
    setViewYear(dObj.getFullYear());
    setViewMonth(dObj.getMonth() + 1);
  };

  const today = todayStr();
  const activeChildInfo = isParent ? children.find((c) => c.id === activeChildId) : null;
  const studentName = isParent ? (activeChildInfo?.name ?? "Child") : (myStudent?.name ?? user?.name ?? "");

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <div className="md:ml-[228px] pt-20 md:pt-6 px-4 md:px-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">My Planner</h1>
              <p className="text-xs text-gray-500 leading-none mt-0.5">
                {isParent ? "Manage daily tasks for your children" : "Your daily tasks & reminders"}
              </p>
            </div>
          </div>
          {(isParent || isStudent) && plannerStudentId && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Task
            </Button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left: calendar */}
          <div className="lg:w-[280px] shrink-0 space-y-4">
            <MiniCalendar
              selected={selectedDate}
              onSelect={handleSelectDate}
              monthSummary={monthSummary}
            />

            {/* Quick nav */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectDate(today)}
                className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${
                  selectedDate === today
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() - 1);
                  handleSelectDate(toDateStr(d));
                }}
                className="w-9 text-xs py-2 px-2.5 rounded-lg border bg-white border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() + 1);
                  handleSelectDate(toDateStr(d));
                }}
                className="w-9 text-xs py-2 px-2.5 rounded-lg border bg-white border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: tasks panel */}
          <div className="flex-1 min-w-0">
            {/* Date heading */}
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {isToday(selectedDate) ? "Today" : formatDateDisplay(selectedDate)}
              </h2>
              {!isToday(selectedDate) && (
                <span className="text-sm text-gray-400">{formatDateShort(selectedDate)}</span>
              )}
              {isToday(selectedDate) && (
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Today</span>
              )}
            </div>

            {/* Parent: child selector + per-child view */}
            {isParent && (
              <>
                <ParentChildSelector
                  children={children}
                  selected={activeChildId}
                  onSelect={setSelectedChildId}
                />
                {activeChildId ? (
                  <StudentDayView
                    studentId={activeChildId}
                    studentName={activeChildInfo?.name ?? "Child"}
                    date={selectedDate}
                    isStudent={false}
                    currentUserId={user?.id ?? 0}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Users className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-gray-400">No children linked yet</p>
                    <Button size="sm" variant="outline" onClick={() => (window.location.href = "/invites")}>
                      Invite Student
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Student: own view */}
            {isStudent && myStudent && (
              <StudentDayView
                studentId={myStudent.id}
                studentName={myStudent.name}
                date={selectedDate}
                isStudent={true}
                currentUserId={user?.id ?? 0}
              />
            )}

            {/* Loading state for student */}
            {isStudent && !myStudent && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task dialog (from header button) */}
      {plannerStudentId && (
        <AddTaskDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          defaultDate={selectedDate}
          defaultStudentId={plannerStudentId}
          children={isParent ? children : [{ id: plannerStudentId, name: studentName }]}
          isStudent={isStudent}
          userId={user?.id ?? 0}
        />
      )}
    </div>
  );
}
