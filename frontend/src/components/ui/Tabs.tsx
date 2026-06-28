
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
    const [prevTitle, setPrevTitle] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    if (title !== prevTitle) {
        setPrevTitle(title);
        setEditValue(title);
    }

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
                group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-r border-white/[0.06]
                transition-colors select-none min-w-[120px] max-w-[220px] relative
                ${isActive
                    ? 'bg-dark-indigo-glow text-slate-100'
                    : 'bg-near-black text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'}
            `}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
        >
            {icon && <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-electric-violet' : 'text-slate-600 group-hover:text-slate-500'}`}>{icon}</span>}

            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white/[0.04] text-white border border-electric-violet/40 focus:border-electric-violet focus:outline-none min-w-0 px-1.5 py-0.5 rounded font-sans"
                />
            ) : (
                <span className="truncate flex-1 font-sans font-medium tracking-tight">{title}</span>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className={`flex-shrink-0 p-1 rounded hover:bg-white/10 hover:text-slate-100 transition-all ${isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'}`}
                aria-label="Close tab"
            >
                <X size={11} />
            </button>

            {isActive && <div className="absolute bottom-0 left-0 right-0 h-px bg-electric-violet"></div>}
        </div>
    );
};
