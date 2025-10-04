
import React from 'react';

interface TimerProps {
  timeLeft: number;
  duration: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, duration }) => {
  const progress = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * 45; // 2 * pi * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getTimerColor = () => {
    if (progress > 50) return 'text-green-400';
    if (progress > 25) return 'text-yellow-400';
    return 'text-red-500';
  };

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-slate-700"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          className={`${getTimerColor()} transition-all duration-1000 linear`}
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className={`text-4xl font-bold ${getTimerColor()}`}>{timeLeft}</span>
    </div>
  );
};

export default Timer;
