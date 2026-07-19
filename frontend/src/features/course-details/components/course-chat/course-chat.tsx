'use client';

import { ListSkeleton } from '../_shared/list-skeleton';
import { ChatComposer } from './chat-composer';
import { ChatHeader } from './chat-header';
import { ChatMessageList } from './chat-message-list';
import { useCourseChatUi } from './use-course-chat-ui';

export interface CourseChatProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseChat({ courseId }: CourseChatProps) {
  const c = useCourseChatUi(courseId);

  if (c.isLoading && !c.chatRoom) {
    return (
      <div className='h-[560px] rounded-xl border bg-background p-4 shadow-sm'>
        <ListSkeleton variant='row' count={7} />
      </div>
    );
  }

  return (
    <section className='overflow-hidden rounded-xl border bg-background shadow-sm'>
      <ChatHeader
        roomName={c.chatRoom?.name}
        messageCount={c.allMessages.length}
        presence={c.presence}
        isConnected={c.isConnected}
      />
      <ChatMessageList
        messages={c.allMessages}
        firstUnreadId={c.scroll.firstUnreadId}
        hasMore={c.chatRoom?.hasMore}
        nextCursor={c.chatRoom?.nextCursor}
        loadOlderPending={c.loadOlder.isPending}
        onLoadOlder={(cursor) => c.loadOlder.mutate(cursor)}
        scrollRef={c.scroll.scrollRef}
        messagesEndRef={c.scroll.messagesEndRef}
        onScroll={c.scroll.handleScroll}
        atBottom={c.scroll.atBottom}
        newCount={c.scroll.newCount}
        onJumpToLatest={() => c.scroll.scrollToBottom('smooth')}
        userId={c.userId}
        flashId={c.scroll.flashId}
        editingId={c.editingId}
        editDraft={c.editDraft}
        setEditDraft={c.setEditDraft}
        editPending={c.editMutation.isPending}
        mentionLabels={c.mentionLabels}
        meSlug={c.meSlug}
        onRegisterRef={c.scroll.registerMessageRef}
        onJumpToReply={c.scroll.jumpToMessage}
        onReply={c.setReplyTo}
        onStartEdit={c.startEdit}
        onCancelEdit={() => c.setEditingId(null)}
        onSaveEdit={c.saveEdit}
        onDelete={c.undoDeleteMessage}
      />
      <ChatComposer
        replyTo={c.replyTo}
        onClearReply={() => c.setReplyTo(null)}
        message={c.message}
        onMessageChange={c.handleInputChange}
        onKeyDown={c.handleComposerKeyDown}
        onBlur={() => c.emitTyping('stop')}
        onSubmit={c.handleSend}
        mentionOpen={c.mentionPicker.open}
        mentionCandidates={c.mentionPicker.candidates}
        onInsertMention={c.insertMention}
        fileInputRef={c.fileInputRef}
        composerRef={c.composerRef}
        onPickFiles={c.pickFiles}
        sendPending={c.sendViaHttp.isPending}
        uploadPending={c.uploadMutation.isPending}
        typing={c.typing}
      />
    </section>
  );
}
