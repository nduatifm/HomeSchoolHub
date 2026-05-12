import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
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
  DialogDescription,
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
  Trash2,
  KeyRound,
  Copy,
  Check,
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

type ParentUser = Pick<User, "id" | "name" | "email" | "role">;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newParentId, setNewParentId] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [adminTempPassword, setAdminTempPassword] = useState<string | null>(null);
  const [copiedAdminPw, setCopiedAdminPw] = useState(false);

  const { data: users = [], isLoading, refetch } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allUsers = [] } = useQuery<ParentUser[]>({
    queryKey: ["/api/users"],
  });
  const parentUsers = allUsers.filter((u) => u.role === "parent");

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role, parentId }: { id: number; role: string; parentId?: number }) =>
      apiRequest(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role, ...(parentId ? { parentId } : {}) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated", type: "success" });
      setRoleDialogOpen(false);
      setNewParentId(0);
    },
    onError: () => toast({ title: "Couldn't update role — try again.", type: "error" }),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ id, isAdmin }: { id: number; isAdmin: boolean }) =>
      apiRequest(`/api/admin/users/${id}/admin`, {
        method: "PATCH",
        body: JSON.stringify({ isAdmin }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Admin status updated", type: "success" });
    },
    onError: () => toast({ title: "Couldn't update admin status — try again.", type: "error" }),
  });

  const resetAccountMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/users/${id}/reset-account`, { method: "PATCH" }) as Promise<{ tempPassword: string }>,
    onSuccess: (data) => {
      setAdminTempPassword(data.tempPassword);
      setCopiedAdminPw(false);
    },
    onError: (err: any) => {
      toast({ title: "Could not reset account", description: err?.message ?? "Something went wrong.", type: "error" });
      setResetTarget(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted", type: "success" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmName("");
    },
    onError: () => toast({ title: "Couldn't delete user — try again.", type: "error" }),
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

      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
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

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setNewRole(u.role || "");
                                    setNewParentId(0);
                                    setRoleDialogOpen(true);
                                  }}
                                >
                                  Change role
                                </DropdownMenuItem>

                                {u.role === "student" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setResetTarget(u);
                                      setAdminTempPassword(null);
                                      setCopiedAdminPw(false);
                                    }}
                                  >
                                    <KeyRound className="w-4 h-4 mr-2 text-amber-500" />
                                    Reset account
                                  </DropdownMenuItem>
                                )}

                                {!u.isSuperAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {u.isAdmin ? (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: false })}
                                      >
                                        <ShieldOff className="w-4 h-4 mr-2" />
                                        Remove admin
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: true })}
                                      >
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Make admin
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive focus:bg-red-50"
                                      onClick={() => {
                                        setUserToDelete(u);
                                        setDeleteConfirmName("");
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete user
                                    </DropdownMenuItem>
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

      {/* Delete user confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) { setUserToDelete(null); setDeleteConfirmName(""); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All data associated with this account will be deleted.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={userToDelete.profilePicture || ""} />
                  <AvatarFallback className="bg-red-100 text-red-700 text-sm font-semibold">
                    {userToDelete.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{userToDelete.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{userToDelete.email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Type <span className="font-bold text-foreground">{userToDelete.name}</span> to confirm
                </label>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={userToDelete.name}
                  className="border-red-200 focus-visible:ring-red-400"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setDeleteDialogOpen(false); setUserToDelete(null); setDeleteConfirmName(""); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmName !== userToDelete.name || deleteUserMutation.isPending}
                  onClick={() => deleteUserMutation.mutate(userToDelete.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {deleteUserMutation.isPending ? "Deleting…" : "Delete permanently"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset account dialog — two steps: confirm → temp password reveal */}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) { setResetTarget(null); setAdminTempPassword(null); setCopiedAdminPw(false); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Reset account for {resetTarget?.name ?? "student"}
            </DialogTitle>
          </DialogHeader>

          {adminTempPassword === null ? (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                This will generate a temporary password for <strong>{resetTarget?.name}</strong> and immediately log them out of all devices.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>A new temporary password will be created</li>
                <li>Their email address will be marked as verified</li>
                <li>All active sessions will be ended immediately</li>
                <li>All classwork, grades, and progress are untouched</li>
              </ul>
              {resetTarget?.googleId && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This student uses Google Sign-In. A temporary password will be added so they can also log in with email and password — their Google login is not removed.
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setResetTarget(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={resetAccountMutation.isPending}
                  onClick={() => resetTarget && resetAccountMutation.mutate(resetTarget.id)}
                >
                  {resetAccountMutation.isPending ? "Resetting…" : "Reset account"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                The account has been reset. Share this temporary password with <strong>{resetTarget?.name}</strong> — it will only be shown once.
              </p>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Temporary password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-base font-semibold text-foreground tracking-widest select-all">
                    {adminTempPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adminTempPassword).then(() => {
                        setCopiedAdminPw(true);
                        setTimeout(() => setCopiedAdminPw(false), 2000);
                      });
                    }}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedAdminPw ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {resetTarget?.name} can log in with their email address and this password, then change it in Profile → Security.
              </p>
              <Button className="w-full" onClick={() => { setResetTarget(null); setAdminTempPassword(null); setCopiedAdminPw(false); }}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={(open) => { setRoleDialogOpen(open); if (!open) setNewParentId(0); }}>
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
                <Select value={newRole} onValueChange={(v) => { setNewRole(v); setNewParentId(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRole === "student" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Assign parent <span className="text-destructive">*</span>
                  </label>
                  <Select value={newParentId ? newParentId.toString() : ""} onValueChange={(v) => setNewParentId(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a parent account" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentUsers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No parent accounts found</div>
                      ) : (
                        parentUsers.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} textValue={p.name}>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">{p.email}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">The student record will be created under this parent.</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => { setRoleDialogOpen(false); setNewParentId(0); }}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (newRole && selectedUser) {
                      changeRoleMutation.mutate({
                        id: selectedUser.id,
                        role: newRole,
                        ...(newRole === "student" ? { parentId: newParentId } : {}),
                      });
                    }
                  }}
                  disabled={!newRole || changeRoleMutation.isPending || (newRole === "student" && !newParentId)}
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
