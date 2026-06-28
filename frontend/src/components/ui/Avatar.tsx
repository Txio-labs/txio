import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { createAvatar } from '@dicebear/core';
import { notionists, bottts, identicon } from '@dicebear/collection';

const avatarStyles = {
  user: notionists,
  bot: bottts,
  team: identicon
};

interface AvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type?: 'user' | 'bot' | 'team';
  className?: string;
  status?: 'online' | 'offline' | 'busy';
  src?: string;
  seed?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  size = 'md', 
  type = 'user', 
  className = '',
  status,
  src,
  seed
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const statusMap = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-600',
    busy: 'bg-red-500'
  };

  const avatarSvg = useMemo(() => {
    if (src) return null;

    const avatar = createAvatar(avatarStyles[type] as any, {
      seed: seed || 'default',
      ...(type === 'user' && {
        backgroundColor: ['0f172a', '1e1b4b'],
      }),
      ...(type === 'bot' && {
        backgroundColor: ['0f172a'],
        // @ts-ignore
        eyes: ['shade01'],
        // @ts-ignore
        mouth: ['smile'],
      }),
      ...(type === 'team' && {
        backgroundColor: ['0f172a'],
      }),
    });

    return avatar.toString();
  }, [type, seed, src]);

  const renderGraphic = () => {
    if (src) {
        return <img src={src} alt="Avatar" className="w-full h-full object-cover" />;
    }

    return (
      <div 
        className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
        dangerouslySetInnerHTML={{ __html: avatarSvg || '' }}
      />
    );
  };

  return (
    <div className={`relative shrink-0 ${sizeMap[size]} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden border border-white/10 bg-near-black flex items-center justify-center">
        {renderGraphic()}
      </div>
      
      {status && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-near-black ${statusMap[status]}`} />
      )}
    </div>
  );
};
