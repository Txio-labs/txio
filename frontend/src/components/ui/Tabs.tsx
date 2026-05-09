
import React, { useState, useEffect, useRef } from 'react';
import { X, Command, Layers } from 'lucide-react';

interface TabProps {
    id: string;
    title: string;
    isActive: boolean;
    onSelect: () => void;
    onClose: () => void;
    onRename?: (newTitle: string) => void;
    icon?: React.ReactNode;
}

export const Tab: React.FC<TabProps> = ({ title, isActive, onSelect, onClose, onRename, icon }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditValue(title);
    }, [title]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRename) {
            setIsEditing(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            finishEditing();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(title);
        }
    };

    const finishEditing = () => {
        setIsEditing(false);
        if (onRename && editValue.trim() !== '') {
            onRename(editValue);
        } else {
            setEditValue(title);
        }
    };

    return (
        <div 
            className={`
                group flex items-center gap-2 px-4 py-2 text-[11px] font-bold cursor-pointer border-r border-slate-800
                transition-all select-none min-w-[140px] max-w-[240px] relative overflow-hidden
                ${isActive 
                    ? 'bg-slate-900 text-sui-400 shadow-[inset_0_2px_0_0_#0ea5e9]' 
                    : 'bg-slate-950 text-slate-500 hover:bg-slate-900 hover:text-slate-300'}
            `}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
        >
            {icon && <span className={`flex-shrink-0 ${isActive ? 'text-sui-400' : 'text-slate-600'}`}>{icon}</span>}
            
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-slate-800 text-white border-b border-sui-500 focus:outline-none min-w-0 px-1 py-0.5 rounded-sm font-sans"
                />
            ) : (
                <span className="truncate flex-1 font-sans uppercase tracking-tight">{title}</span>
            )}

            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className={`flex-shrink-0 p-1 rounded-md hover:bg-slate-700 hover:text-white transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <X size={10} />
            </button>
            
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sui-500 to-transparent"></div>}
        </div>
    );
};
