"use client";

import { useState, useEffect, useRef } from "react";

export function useLabTimer() {
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [progressValue, setProgressValue] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (expiresAt) {
      // Set up timer to track remaining time
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        
        if (diff <= 0) {
          // Time expired, clear interval
          if (timerRef.current) clearInterval(timerRef.current);
          setProgressValue(0);
          setTimeRemaining(0);
        } else {
          // Update time remaining
          setTimeRemaining(Math.floor(diff / 1000)); // Convert to seconds
          
          // Calculate percentage time remaining
          const totalDuration = expiresAt.getTime() - (new Date(expiresAt.getTime() - (60 * 60 * 1000))).getTime(); // Assuming 1 hour sessions
          const remainingPercentage = (diff / totalDuration) * 100;
          setProgressValue(remainingPercentage);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [expiresAt]);

  return { expiresAt, timeRemaining, progressValue, setExpiresAt };
}