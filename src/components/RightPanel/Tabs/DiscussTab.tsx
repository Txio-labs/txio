import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Comment } from '../../../types';
import { Avatar } from '../../ui/Avatar';

interface DiscussTabProps {
  comments: Comment[];
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: (e: React.FormEvent) => void;
}

export const DiscussTab: React.FC<DiscussTabProps> = ({
  comments,
  commentInput,
  onCommentInputChange,
  onSubmitComment,
}) => {
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center mt-20 opacity-50">
            <MessageSquare size={24} className="mx-auto mb-2 text-fg-muted"/>
            <p className="text-xs text-fg-subtle">No comments on this request.</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <Avatar size="sm" type="user" seed={c.userName} />
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-fg-muted">{c.userName}</span>
                  <span className="text-[12px] text-fg-muted">{new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-xs text-fg-subtle bg-elevated p-2 rounded-lg rounded-tl-none border border-line">
                  {c.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      <div className="p-3 border-t border-line bg-surface">
        <form onSubmit={onSubmitComment} className="relative">
          <input 
            className="w-full bg-surface border border-line rounded-lg py-2 pl-3 pr-10 text-xs text-fg focus:border-line-strong outline-none transition-all placeholder:text-fg-subtle"
            placeholder="Add a comment..."
            value={commentInput}
            onChange={(e) => onCommentInputChange(e.target.value)}
          />
          <button type="submit" disabled={!commentInput.trim()} className="absolute right-2 top-1.5 text-fg-subtle hover:text-fg disabled:opacity-50 transition-colors">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};