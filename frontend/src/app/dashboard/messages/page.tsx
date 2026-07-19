'use client';

import { useState } from 'react';
import { MessageSquareDashed } from 'lucide-react';
import { InboxList } from '@/features/inbox/components/inbox-list';
import { DmPane } from '@/features/discussions/components/dms';
import { ChannelPane } from '@/features/discussions/components/channel';

export default function MessagesPage() {
  const [activeHref, setActiveHref] = useState<string | null>(null);

  const isDm = activeHref?.includes('/chat/dm/');
  const isGroup = activeHref?.includes('/chat/') && !isDm;
  
  const dmIdMatch = activeHref?.match(/\/chat\/dm\/(\d+)/);
  const groupIdMatch = activeHref?.match(/\/chat\/\d+\/(\d+)/);
  
  const dmId = dmIdMatch ? Number(dmIdMatch[1]) : null;
  const groupId = groupIdMatch ? Number(groupIdMatch[1]) : null;

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      {/* Left Pane: Inbox List */}
      <div className={`w-full md:w-[400px] flex-shrink-0 border-r bg-card flex flex-col ${activeHref ? 'hidden md:flex' : 'flex'}`}>
      {/* Left Pane Header */}
        <div className="flex h-14 shrink-0 items-center gap-3 bg-[#0D3B66] px-4 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <MessageSquareDashed className="size-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Messages</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InboxList 
            activeHref={activeHref || undefined} 
            onSelect={(href) => setActiveHref(href)} 
          />
        </div>
      </div>
      
      {/* Right Pane: Active Chat or Empty State */}
      <div className={`flex-1 flex-col bg-[#E6F0FA]/20 dark:bg-background ${activeHref ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
        {activeHref ? (
          <>
            {isDm && dmId ? <DmPane groupDmId={dmId} /> : null}
            {isGroup && groupId ? <ChannelPane channelId={groupId} /> : null}
          </>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquareDashed className="size-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-light text-foreground">Campus Connect Web</h2>
              <p className="text-sm text-muted-foreground">
                Select a conversation from the left to start messaging. Send and receive messages securely with your peers and faculty.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
