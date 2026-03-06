import { useState } from 'react';
import {
  MessageSquarePlus,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  PanelLeftClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFelixChatContext, type FelixChatSession } from '@/context/FelixChatContext';

interface ChatSessionItemProps {
  session: FelixChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function ChatSessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: ChatSessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleSaveRename = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditTitle(session.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer',
        isActive
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-accent/50 border border-transparent'
      )}
      onClick={!isEditing ? onSelect : undefined}
    >
      <MessageSquare className={cn(
        'h-4 w-4 shrink-0',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )} />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs"
            autoFocus
            onClick={e => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={e => {
              e.stopPropagation();
              handleSaveRename();
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={e => {
              e.stopPropagation();
              handleCancelRename();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm truncate',
              isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {session.title}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {formatDate(session.updatedAt)}
              {session.messages.length > 0 && (
                <span className="ml-1.5">
                  ({session.messages.length} messages)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={e => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface ChatSessionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSessionPanel({ open, onOpenChange }: ChatSessionPanelProps) {
  const {
    sessions,
    activeSessionId,
    startNewChat,
    switchSession,
    deleteSession,
    renameSession,
  } = useFelixChatContext();

  const handleNewChat = () => {
    startNewChat();
    // Keep panel open on desktop, close on mobile
    if (window.innerWidth < 768) {
      onOpenChange(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    switchSession(sessionId);
    // Close panel on mobile after selection
    if (window.innerWidth < 768) {
      onOpenChange(false);
    }
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.updatedAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    let group: string;
    if (date.toDateString() === today.toDateString()) {
      group = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'Yesterday';
    } else if (date > lastWeek) {
      group = 'Previous 7 Days';
    } else {
      group = 'Older';
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, FelixChatSession[]>);

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Chat History</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => onOpenChange(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2"
            size="sm"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No chat sessions yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Start a new chat to begin
                </p>
              </div>
            ) : (
              groupOrder.map(group => {
                const groupSessions = groupedSessions[group];
                if (!groupSessions || groupSessions.length === 0) return null;

                return (
                  <div key={group}>
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                      {group}
                    </p>
                    <div className="space-y-1">
                      {groupSessions.map(session => (
                        <ChatSessionItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeSessionId}
                          onSelect={() => handleSelectSession(session.id)}
                          onDelete={() => deleteSession(session.id)}
                          onRename={title => renameSession(session.id, title)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            {sessions.length} chat{sessions.length !== 1 ? 's' : ''} saved locally
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Standalone trigger button for use in the chat header
export function ChatSessionTrigger({
  onClick,
  sessionCount,
}: {
  onClick: () => void;
  sessionCount: number;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground"
      onClick={onClick}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Sessions
      {sessionCount > 0 && (
        <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5">
          {sessionCount}
        </span>
      )}
    </Button>
  );
}
