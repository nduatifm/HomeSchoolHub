import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Message {
  id: number;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

interface MessagesCardProps {
  messages: Message[];
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function MessagesCard({
  messages,
  loading = false,
  error = false,
  className,
}: MessagesCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle className="text-lg font-semibold">Recent Messages</CardTitle>
        <Link href="/messages">
          <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
            View All
          </a>
        </Link>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading messages...
          </div>
        ) : error ? (
          <div className="px-6 py-4 text-center text-sm text-red-500 dark:text-red-400">
            Failed to load messages. Please try again.
          </div>
        ) : messages.length === 0 ? (
          <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No recent messages.
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="px-6 py-4 flex">
                <div className="mr-4 flex-shrink-0">
                  <img 
                    src={message.senderAvatar} 
                    alt={message.senderName} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{message.senderName} {message.senderRole && `(${message.senderRole})`}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {message.content}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="px-6 py-4 text-center">
              <Link href="/messages">
                <a className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                  Reply to messages
                </a>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
