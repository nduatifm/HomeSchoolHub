import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Message, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, PlusCircle } from "lucide-react";
import { formatRelativeTime, truncateText } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for sending a message
const sendMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient is required"),
  content: z.string().min(1, "Message is required"),
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);

  // Create message form
  const messageForm = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Reply form
  const replyForm = useForm({
    defaultValues: {
      replyMessage: "",
    },
  });

  // Fetch messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/messages/user/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch potential message recipients
  const isStudent = user?.role === "student";
  const isTutor = user?.role === "tutor";
  const isParent = user?.role === "parent";

  // Get appropriate recipient list based on role
  const recipientQueryKey = isTutor 
    ? [`/api/students/tutor/${user?.id}`] 
    : isStudent
      ? ["/api/users/role/tutor"]
      : isParent
        ? ["/api/users/role/tutor"]
        : null;

  const { data: recipients, isLoading: isLoadingRecipients } = useQuery<User[]>({
    queryKey: recipientQueryKey,
    enabled: !!user?.id && !!recipientQueryKey,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: SendMessageFormValues) => {
      return apiRequest("POST", "/api/messages", {
        receiverId: data.receiverId,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/user/${user?.id}`] });
      setNewMessageDialogOpen(false);
      messageForm.reset();
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reply to message mutation
  const replyToMessage = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      return apiRequest("POST", "/api/messages", {
        receiverId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/user/${user?.id}`] });
      replyForm.reset();
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send reply: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mark message as read mutation
  const markAsRead = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/user/${user?.id}`] });
    },
  });

  // Handle sending a new message
  const onSubmitNewMessage = (data: SendMessageFormValues) => {
    sendMessage.mutate(data);
  };

  // Handle sending a reply
  const onSubmitReply = (data: { replyMessage: string }) => {
    if (!selectedConversation || !data.replyMessage.trim()) return;
    
    replyToMessage.mutate({
      receiverId: selectedConversation,
      content: data.replyMessage,
    });
  };

  // Process messages to organize by conversation
  const conversations = messages 
    ? messages.reduce((acc, message) => {
        const otherPersonId = message.senderId === user?.id ? message.receiverId : message.senderId;
        
        if (!acc[otherPersonId]) {
          acc[otherPersonId] = {
            userId: otherPersonId,
            messages: [],
            lastMessageTime: new Date(message.createdAt || Date.now()),
            unreadCount: message.senderId !== user?.id && !message.read ? 1 : 0,
          };
        } else {
          if (message.senderId !== user?.id && !message.read) {
            acc[otherPersonId].unreadCount += 1;
          }
          
          if (new Date(message.createdAt || Date.now()) > acc[otherPersonId].lastMessageTime) {
            acc[otherPersonId].lastMessageTime = new Date(message.createdAt || Date.now());
          }
        }
        
        acc[otherPersonId].messages.push(message);
        return acc;
      }, {} as Record<string, { userId: string; messages: Message[]; lastMessageTime: Date; unreadCount: number }>)
    : {};

  // Sort conversations by last message time
  const sortedConversations = Object.values(conversations).sort(
    (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
  );

  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? sortedConversations.filter(convo => {
        const person = recipients?.find(r => r.id === convo.userId);
        return person && 
          (person.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           person.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           person.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      })
    : sortedConversations;

  // Get messages for selected conversation
  const conversationMessages = selectedConversation ? conversations[selectedConversation]?.messages || [] : [];
  
  // Sort messages by time
  const sortedMessages = [...conversationMessages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  // Get the name of the selected conversation contact
  const selectedContact = recipients?.find(r => r.id === selectedConversation);

  return (
    <DashboardLayout 
      title="Messages" 
      subtitle="Communicate with students, parents, and tutors in one place."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversation List */}
        <Card className="md:col-span-1">
          <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Conversations</CardTitle>
            <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>
                    Send a message to a student, parent, or tutor.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(onSubmitNewMessage)} className="space-y-4">
                    <FormField
                      control={messageForm.control}
                      name="receiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a recipient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingRecipients ? (
                                <SelectItem value="loading">Loading recipients...</SelectItem>
                              ) : (recipients || []).map((recipient) => (
                                <SelectItem key={recipient.id} value={recipient.id}>
                                  {recipient.firstName} {recipient.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={messageForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Type your message here..." 
                              className="resize-none min-h-[100px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setNewMessageDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={sendMessage.isPending}>
                        {sendMessage.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
            {isLoadingMessages ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? "No matching conversations found." : "No conversations yet."}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const person = recipients?.find(r => r.id === conversation.userId);
                const lastMessage = conversation.messages.sort(
                  (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                )[0];
                
                return (
                  <div 
                    key={conversation.userId}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
                      selectedConversation === conversation.userId && "bg-gray-50 dark:bg-gray-900"
                    )}
                    onClick={() => {
                      setSelectedConversation(conversation.userId);
                      conversation.messages.forEach(message => {
                        if (message.senderId !== user?.id && !message.read) {
                          markAsRead.mutate(message.id);
                        }
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={person?.profileImageUrl} alt={person?.firstName || "User"} />
                        <AvatarFallback>{person?.firstName?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium truncate">
                            {person?.firstName} {person?.lastName}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatRelativeTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                            {lastMessage?.senderId === user?.id ? "You: " : ""}
                            {truncateText(lastMessage?.content || "", 30)}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Conversation Messages */}
        <Card className="md:col-span-2">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-lg font-semibold">
              {selectedConversation && selectedContact 
                ? `${selectedContact.firstName} ${selectedContact.lastName}`
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[600px]">
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a conversation to view messages
              </div>
            ) : (
              <>
                <div className="flex-1 p-6 overflow-y-auto">
                  {sortedMessages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedMessages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg p-4",
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
                              <span className="text-xs opacity-70 mt-1 block">
                                {message.createdAt && formatRelativeTime(new Date(message.createdAt))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t">
                  <form 
                    onSubmit={replyForm.handleSubmit((data) => onSubmitReply(data))}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Type your message..."
                      className="flex-1"
                      {...replyForm.register("replyMessage")}
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={replyToMessage.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
