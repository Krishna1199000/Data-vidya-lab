"use client";

import { 
  CheckCircle, 
  Cloud, 
  EllipsisVertical, 
  Home, 
  HelpCircle, 
  RotateCcw, 
  X 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionBarProps {
  timeRemaining: number;
  endLab: () => void;
  onShowCredentials: () => void;
}

export function ActionBar({ timeRemaining, endLab, onShowCredentials }: ActionBarProps) {
  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 pt-4 text-gray-900">
      {/* Circular Time Display */}
      <div className="w-20 h-20 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-900 text-sm font-semibold">
        {formatTimeRemaining(timeRemaining)}
      </div>

      {/* Checklist Icon */}
      <div className="text-gray-700">
        <CheckCircle className="h-6 w-6" />
      </div>

      {/* Ellipsis Icon with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="text-gray-700 cursor-pointer">
            <EllipsisVertical className="h-6 w-6" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Restart
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2" 
            onClick={endLab}
          >
            <X className="h-4 w-4" /> End Lab
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cloud Icon */}
      <div
        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer"
        onClick={onShowCredentials}
      >
        <Cloud className="h-5 w-5" />
      </div>

      {/* Spacer to push bottom icons down */}
      <div className="flex-grow min-h-[50px]"></div>

      {/* Home Icon */}
      <div className="text-gray-700">
        <Home className="h-6 w-6" />
      </div>

      {/* Help Icon */}
      <div className="w-10 h-10 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-700">
        <HelpCircle className="h-5 w-5" />
      </div>
    </div>
  );
}