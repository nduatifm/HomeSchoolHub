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
    <div className="flex items-center justify-between mb-4" data-testid="welcome-card">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-lg font-semibold text-foreground">{name}</h1>
      </div>
      {buttonText && onButtonClick && (
        <Button
          onClick={onButtonClick}
          size="sm"
          variant="outline"
          className="text-xs"
          data-testid="welcome-button"
        >
          {buttonText}
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
