
import React, { useEffect, useState } from 'react';
import logo from '../assets/logo.png';

interface EntranceAnimationProps {
  onComplete: () => void;
}

// Reusing the High-Fidelity Flow Logo for the intro
// Using the provided image file. Ensure 'flow-logo.png' is placed in your public directory.
const FlowLogo = () => (
  <img 
    src={logo} 
    alt="Flow Logo"
    className="w-full h-full object-contain drop-shadow-2xl"
  />
);

export const EntranceAnimation: React.FC<EntranceAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Respect user reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Sequence timing
    // 0ms: Animation Start
    // 2200ms: Animation End
    // 2800ms: Begin Exit Fade
    // 3800ms: Unmount
    
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 2800);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3600); 

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]
        transition-opacity duration-700 ease-in-out overflow-hidden
        ${phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
        <div className="relative flex flex-col items-center justify-center pb-20">
            
            {/* The Surface Glow (Water Level) - Widened for larger logo */}
            <div className="absolute top-[58%] left-1/2 -translate-x-1/2 w-[600px] h-6 bg-cyan-500/10 blur-2xl rounded-[100%] animate-pulse-slow"></div>

            {/* Logo Wrapper */}
            <div className="relative group">
                {/* Main Logo (Emerging) - Increased Size */}
                <div className="w-72 h-72 relative z-10 animate-water-rise origin-bottom">
                    <FlowLogo />
                </div>

                {/* Reflection (Water Effect) - Increased Size & Adjusted Position */}
                <div className="absolute top-[85%] left-0 w-72 h-72 z-0 animate-water-reflection opacity-0 pointer-events-none">
                     <div className="w-full h-full transform scale-y-[-1] origin-top filter blur-[3px] opacity-50 mix-blend-screen reflection-mask">
                        <FlowLogo />
                     </div>
                </div>
            </div>

            {/* Text Reveal - Pushed down to accommodate size */}
            <h1 className="mt-12 text-slate-500 font-medium text-xs tracking-[0.5em] uppercase opacity-0 animate-fade-in-text">
                Welcome to Flow
            </h1>
        </div>

        <style>{`
            .reflection-mask {
               -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%);
               mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%);
            }
            @keyframes water-rise {
              0% {
                 opacity: 0;
                 transform: translateY(120px) scale(0.9);
                 filter: blur(12px) brightness(1.5) hue-rotate(-15deg); /* Underwater look */
              }
              100% {
                 opacity: 1;
                 transform: translateY(0) scale(1);
                 filter: blur(0) brightness(1) hue-rotate(0deg);
              }
            }
            @keyframes water-reflection {
               0% {
                  opacity: 0;
                  transform: translateY(100px) scaleY(-1) scale(0.9); /* Closer to object initially */
               }
               100% {
                  opacity: 0.4;
                  transform: translateY(0) scaleY(-1) scale(1); /* Separates as main logo rises */
               }
            }
            @keyframes fade-in-text {
               0% { opacity: 0; transform: translateY(20px); }
               60% { opacity: 0; }
               100% { opacity: 1; transform: translateY(0); }
            }
            .animate-water-rise {
               animation: water-rise 2.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .animate-water-reflection {
               animation: water-reflection 2.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .animate-fade-in-text {
               animation: fade-in-text 2.6s ease-out forwards;
            }
            .animate-pulse-slow {
               animation: pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
        `}</style>
    </div>
  );
};
