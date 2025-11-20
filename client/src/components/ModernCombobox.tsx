import { useState, useRef, useEffect } from "react";
import { Check, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ModernComboboxProps {
  users: any[];
  selectedUserId: number;
  onSelect: (userId: number) => void;
  placeholder?: string;
  testId?: string;
}

export default function ModernCombobox({
  users,
  selectedUserId,
  onSelect,
  placeholder = "Search users...",
  testId = "select-user",
}: ModernComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full justify-between h-auto p-3 border-2 rounded-xl hover:border-primary/50 transition-all bg-white flex items-center gap-3"
        data-testid={testId}
      >
        {selectedUser ? (
          <>
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarImage src={selectedUser.profilePicture || ""} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium text-sm text-left">{selectedUser.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{selectedUser.role}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(0);
              }}
              className="h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Clear selection"
              data-testid={`${testId}-clear`}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>{placeholder}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50">
            <Search className="mr-2 h-4 w-4 shrink-0 text-purple-600" />
            <input
              placeholder="Search users..."
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              data-testid={`${testId}-search`}
              aria-label="Search users"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto p-2">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelect(user.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-3 w-full px-3 py-3 cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition-all"
                  data-testid={`select-user-${user.id}`}
                >
                  <Avatar className="w-12 h-12 ring-2 ring-purple-100">
                    <AvatarImage src={user.profilePicture || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 items-start">
                    <span className="font-medium text-sm">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email || `${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
                    </span>
                  </div>
                  {selectedUserId === user.id && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
