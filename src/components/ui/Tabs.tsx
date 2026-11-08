
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
                group relative flex items-center gap-2 h-full pl-3 pr-1.5 text-xs cursor-pointer rounded-t-[8px]
                transition-colors select-none min-w-[120px] max-w-[220px] border border-b-0
                ${isActive
                    ? 'bg-surface text-fg border-line -mb-px z-[1]'
                    : 'border-transparent text-fg-subtle hover:text-fg hover:bg-hover'}
            `}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
        >
            {icon && <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-fg-muted' : 'text-fg-subtle'}`}>{icon}</span>}

            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-sunken text-fg border border-line-strong focus:outline-none min-w-0 px-1.5 py-0.5 rounded-md"
                />
            ) : (
                <span className="truncate flex-1 font-medium">{title}</span>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className={`flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-[5px] text-fg-subtle hover:bg-active hover:text-fg transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                aria-label="Close tab"
            >
                <X size={11} />
            </button>
        </div>
    );
};
