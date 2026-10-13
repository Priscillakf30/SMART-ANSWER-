import React from 'react';
import logoImg from '../../assets/images/smart_answer_logo_1791907551974.jpg';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Brand Icon with rounded container and subtle glow */}
      <div className={`relative ${iconSizes[size]} shrink-0 rounded-2xl overflow-hidden bg-white shadow-md shadow-sky-500/15 border border-sky-100 flex items-center justify-center p-0.5`}>
        <img
          src={logoImg}
          alt="Smart Answer Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className={`font-black tracking-tight leading-tight flex items-center gap-1.5 ${titleSizes[size]}`}>
            <span className="text-slate-900">Smart</span>
            <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              Answer
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">
              SJKC
            </span>
          </div>
          <div className={`text-slate-400 font-medium tracking-wide ${subtitleSizes[size]}`}>
            智能答题 • 触控手写 • 在线批改
          </div>
        </div>
      )}
    </div>
  );
};
