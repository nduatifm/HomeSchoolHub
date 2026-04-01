import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ModernSidebar from "@/components/ModernSidebar";
import {
  Bell,
  CheckCheck,
  FileText,
  Star,
  ClipboardCheck,
  UserPlus,
  BookOpen,
  MessageSquare,
  LayoutList,
  ArrowLeft,
} from "lucide-react";

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function notifIcon(type: string) {
  switch (type) {
    case "new_assignment":
      return <FileText className="w-4 h-4 text-blue-500" />;
    case "assignment_graded":
      return <Star className="w-4 h-4 text-amber-500" />;
    case "assignment_submitted":
      return <ClipboardCheck className="w-4 h-4 text-green-600" />;
    case "tutor_request_update":
    case "new_tutor_request":
      return <UserPlus className="w-4 h-4 text-violet-500" />;
    case "progress_report":
      return <BookOpen className="w-4 h-4 text-teal-500" />;
    case "new_post":
      return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    case "new_clarification":
      return <MessageSquare className="w-4 h-4 text-orange-400" />;
    default:
      return <LayoutList className="w-4 h-4 text-gray-400" />;
  }
}

const typeLabel: Record<string, string> = {
  new_assignment: "Assignments",
  assignment_graded: "Grades",
  assignment_submitted: "Submissions",
  new_tutor_request: "Tutor Requests",
  tutor_request_update: "Tutor Requests",
  progress_report: "Progress Reports",
  new_post: "Classroom Posts",
  new_clarification: "Questions",
};

function groupByType(items: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  for (const n of items) {
    const key = typeLabel[n.type] ?? "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
  });
  const unreadCount = countData?.count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) =>
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () =>
      await apiRequest("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) {
      window.location.href = n.link;
    }
  };

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const earlierItems = notifications.filter((n) => !isToday(n.createdAt));

  const renderItem = (n: Notification) => (
    <div
      key={n.id}
      onClick={() => handleNotificationClick(n)}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
        n.isRead
          ? "bg-white border-gray-100 hover:bg-gray-50 opacity-70"
          : "bg-green-50/40 border-green-100 hover:bg-green-50"
      }`}
    >
      <span className="shrink-0 w-9 h-9 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
        {notifIcon(n.type)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {!n.isRead && (
            <span className="w-2 h-2 rounded-full bg-green-600 shrink-0" />
          )}
          <p className="text-sm font-semibold text-gray-800 truncate">
            {n.title}
          </p>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );

  const renderGroup = (items: Notification[], bucketLabel: string) => {
    if (items.length === 0) return null;
    const groups = groupByType(items);
    return (
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {bucketLabel}
        </h2>
        <div className="space-y-2">
          {Object.entries(groups).map(([groupName, groupItems]) => (
            <div key={groupName}>
              {Object.keys(groups).length > 1 && (
                <p className="text-xs font-medium text-gray-400 mb-1.5 mt-3">
                  {groupName}
                </p>
              )}
              <div className="space-y-1.5">{groupItems.map(renderItem)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />

      <main className="flex-1 md:ml-[228px] min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/dashboard")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-green-700 text-white text-[11px] font-semibold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                No notifications yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You'll see updates about assignments, messages, and more here.
              </p>
            </div>
          ) : (
            <>
              {renderGroup(todayItems, "Today")}
              {renderGroup(earlierItems, "Earlier")}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
