import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface WelcomeCardProps {
  name: string;
  message: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export default function WelcomeCard({
  name,
  message,
  buttonText,
  onButtonClick,
}: WelcomeCardProps) {
  return (
    <div
      className="bg-primary rounded-xl px-8 py-6 text-white shadow-sm"
      data-testid="welcome-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 mb-1">Welcome back</p>
          <h1 className="text-2xl font-bold mb-1">{name}</h1>
          <p className="text-sm text-white/75 max-w-lg">{message}</p>
        </div>
        {buttonText && onButtonClick && (
          <Button
            onClick={onButtonClick}
            variant="ghost"
            className="ml-6 shrink-0 bg-white/15 hover:bg-white/25 text-white border-0 font-medium"
            data-testid="welcome-button"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
