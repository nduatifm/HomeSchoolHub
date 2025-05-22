import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date, timeOnly: boolean = false): string {
  try {
    if (timeOnly) {
      return format(date, "h:mm a");
    }
    return format(date, "h:mm a, MMM do");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

export function formatRelativeTime(date: Date): string {
  try {
    return formatDistance(date, new Date(), { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Unknown time";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return "bg-secondary-100 text-secondary-600 dark:bg-secondary-900/20 dark:text-secondary-400";
    case 'in_progress':
      return "bg-accent-100 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400";
    case 'overdue':
      return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    case 'new':
    case 'assigned':
      return "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
}
