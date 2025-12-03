import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

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
      className="bg-primary rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
      data-testid="welcome-card"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3"></div>

      <div className="relative z-10 flex items-center gap-8">
        <div className="flex-1">
          <p className="text-lg opacity-90 mb-2">Welcome back</p>
          <h1 className="text-4xl font-bold mb-3">{name}</h1>
          <p className="text-base opacity-80 mb-6">{message}</p>
          {buttonText && onButtonClick && (
            <Button
              onClick={onButtonClick}
              variant="ghost"
              size="lg"
              className="bg-white/20 hover:bg-white/30 text-white hover:text-white border-0 rounded-xl"
              data-testid="welcome-button"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {buttonText}
            </Button>
          )}
        </div>

        <div className="hidden lg:flex items-center justify-center">
          <div className="w-48 h-48 bg-white/10 rounded-3xl p-4 backdrop-blur-sm">
            <div className="w-full h-full bg-white/20 rounded-2xl flex items-center justify-center">
              <Calendar className="w-20 h-20 text-white/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
