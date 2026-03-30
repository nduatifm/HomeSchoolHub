import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Search,
  Users,
  Shield,
  UserCheck,
  RefreshCw,
  Crown,
  ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";
import ModernSidebar from "@/components/ModernSidebar";

type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string | null;
  profilePicture: string | null;
  isEmailVerified: boolean;
  googleId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string | null;
};

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  const map: Record<string, string> = {
    teacher: "bg-blue-100 text-blue-700 border-blue-200",
    parent: "bg-purple-100 text-purple-700 border-purple-200",
    student: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[role] ?? "bg-muted text-muted-foreground border-border"}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function SignupMethodBadge({ googleId }: { googleId: string | null }) {
  if (googleId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <svg className="w-3 h-3" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Email</span>;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState("");

  const { data: users = [], isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiRequest(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated successfully" });
      setRoleDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed to update role", description: e.message, type: "error" }),
  });

  const toggleSuperAdminMutation = useMutation({
    mutationFn: ({ id, isSuperAdmin }: { id: number; isSuperAdmin: boolean }) =>
      apiRequest(`/api/admin/users/${id}/super-admin`, {
        method: "PATCH",
        body: JSON.stringify({ isSuperAdmin }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Admin status updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update admin status", description: e.message, type: "error" }),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.isAdmin || u.isSuperAdmin).length;
  const teacherCount = users.filter((u) => u.role === "teacher").length;
  const verifiedCount = users.filter((u) => u.isEmailVerified).length;

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />

      <div className="md:ml-[240px] flex">
        <main className="flex-1 p-6 pt-20 md:pt-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard">
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Link>
              <h1 className="text-xl font-semibold text-foreground">User Management</h1>
              {currentUser?.isSuperAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Crown className="w-3 h-3" />
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage platform users, roles, and admin access.</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Users", value: totalUsers, icon: <Users className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
              { label: "Admins", value: adminCount, icon: <Shield className="w-4 h-4" />, color: "text-primary bg-primary/10" },
              { label: "Teachers", value: teacherCount, icon: <UserCheck className="w-4 h-4" />, color: "text-purple-600 bg-purple-50" },
              { label: "Verified", value: verifiedCount, icon: <ShieldCheck className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none mb-0.5">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + refresh */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>ID</TableHead>
                  {currentUser?.isSuperAdmin && <TableHead className="text-right pr-4">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                            <div className="h-2.5 w-40 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                      </TableCell>
                      {Array.from({ length: currentUser?.isSuperAdmin ? 7 : 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-3 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentUser?.isSuperAdmin ? 8 : 7} className="text-center py-10 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* User col */}
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={u.profilePicture || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                              {u.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{u.name}</p>
                              {u.isSuperAdmin && (
                                <Crown className="w-3 h-3 text-primary shrink-0" />
                              )}
                              {u.isAdmin && !u.isSuperAdmin && (
                                <Shield className="w-3 h-3 text-primary/70 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell><RoleBadge role={u.role} /></TableCell>

                      {/* Signup method */}
                      <TableCell><SignupMethodBadge googleId={u.googleId} /></TableCell>

                      {/* Email verified */}
                      <TableCell>
                        {u.isEmailVerified ? (
                          <span className="text-xs text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>

                      {/* Admin badge */}
                      <TableCell>
                        {u.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            <Crown className="w-3 h-3" />
                            Super
                          </span>
                        ) : u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Joined date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </TableCell>

                      {/* User ID */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">#{u.id}</span>
                      </TableCell>

                      {/* Actions (super admin only) */}
                      {currentUser?.isSuperAdmin && (
                        <TableCell className="text-right pr-4">
                          {u.id !== currentUser.id ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel>Manage {u.name.split(" ")[0]}</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {u.role !== "student" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setNewRole(u.role || "");
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    Change role
                                  </DropdownMenuItem>
                                )}

                                {!u.isSuperAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {u.isAdmin ? (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => toggleSuperAdminMutation.mutate({ id: u.id, isSuperAdmin: false })}
                                      >
                                        <ShieldOff className="w-4 h-4 mr-2" />
                                        Remove admin
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => toggleSuperAdminMutation.mutate({ id: u.id, isSuperAdmin: true })}
                                      >
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Make admin
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground pr-2">You</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing {filtered.length} of {totalUsers} users
            </p>
          )}
        </main>
      </div>

      {/* Change role dialog — teacher/parent only */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedUser.profilePicture || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (newRole && selectedUser) {
                      changeRoleMutation.mutate({ id: selectedUser.id, role: newRole });
                    }
                  }}
                  disabled={!newRole || changeRoleMutation.isPending}
                >
                  {changeRoleMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
