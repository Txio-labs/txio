
import React, { useEffect, useState } from 'react';
import logoDark from '../assets/txio2.png';
import logoLight from '../assets/txio3.png';
import { useAppStore } from '@/lib/store';

interface EntranceAnimationProps {
  onComplete: () => void;
}

const TxioLogo = () => {
  const { theme } = useAppStore();
  const logo = theme === 'dark' ? logoDark : logoLight;
  return (
    <img 
      src={logo.src} 
      alt="txio Logo"
      className="w-full h-full object-contain drop-shadow-2xl"
    />
  );
};

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
        fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-near-black
        transition-opacity duration-1000 ease-in-out overflow-hidden
        ${phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
        <div className="relative flex flex-col items-center justify-center pb-20">
            
            {/* Background Glows */}
            <div className="absolute w-[800px] h-[800px] bg-electric-violet/5 blur-[120px] rounded-full animate-pulse-slow"></div>
            
            {/* The Surface Glow (Water Level) */}
            <div className="absolute top-[58%] left-1/2 -translate-x-1/2 w-[600px] h-6 bg-electric-violet/20 blur-2xl rounded-[100%]"></div>

            {/* Logo Wrapper */}
            <div className="relative group">
                {/* Main Logo (Emerging) */}
                <div className="w-72 h-72 relative z-10 animate-water-rise origin-bottom">
                    <TxioLogo />
                </div>

                {/* Reflection (Water Effect) */}
                <div className="absolute top-[85%] left-0 w-72 h-72 z-0 animate-water-reflection opacity-0 pointer-events-none">
                     <div className="w-full h-full transform scale-y-[-1] origin-top filter blur-[4px] opacity-40 mix-blend-screen reflection-mask">
                        <TxioLogo />
                     </div>
                </div>
            </div>

            {/* Text Reveal */}
            <div className="mt-16 flex flex-col items-center gap-3 opacity-0 animate-fade-in-text">
                <h1 className="text-white font-bold text-2xl tracking-[0.6em] lowercase">
                    txio
                </h1>
                <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-electric-violet to-transparent"></div>
                <p className="text-soft-purple/40 font-medium text-[10px] tracking-[0.4em] uppercase">
                    Advanced Infrastructure
                </p>
            </div>
        </div>

        <style>{`
            .reflection-mask {
               -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%);
               mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%);
            }
            @keyframes water-rise {
              0% {
                 opacity: 0;
                 transform: translateY(150px) scale(0.85);
                 filter: blur(15px) brightness(1.8) hue-rotate(240deg); /* Violet underwater look */
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
                  transform: translateY(100px) scaleY(-1) scale(0.85);
               }
               100% {
                  opacity: 0.3;
                  transform: translateY(0) scaleY(-1) scale(1);
               }
            }
            @keyframes fade-in-text {
               0% { opacity: 0; transform: translateY(30px); filter: blur(10px); }
               70% { opacity: 0; }
               100% { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            .animate-water-rise {
               animation: water-rise 2.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .animate-water-reflection {
               animation: water-reflection 2.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .animate-fade-in-text {
               animation: fade-in-text 3s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .animate-pulse-slow {
               animation: pulse-glow 8s ease-in-out infinite;
            }
            @keyframes pulse-glow {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }
        `}</style>
    </div>
  );
};