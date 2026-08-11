'use client';

import { ComposerMediaActions } from './composer-media-actions';
import { ComposerQaActions } from './composer-qa-actions';

interface ComposerToolbarProps {
  canAttachFiles: boolean;
  onAttachClick: () => void;
  emojiOpen: boolean;
  setEmojiOpen: (open: boolean) => void;
  onInsertEmoji: (emoji: string) => void;
  isThreadReply: boolean;
  isQaChannel: boolean;
  effectiveAskAsQuestion: boolean;
  effectivePostAnonymously: boolean;
  slashActive: boolean;
  value: string;
  setValue: (v: string) => void;
  setAskAsQuestion: React.Dispatch<React.SetStateAction<boolean>>;
  setPostAnonymously: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
  return (
    <>
      <ComposerMediaActions
        canAttachFiles={props.canAttachFiles}
        onAttachClick={props.onAttachClick}
        emojiOpen={props.emojiOpen}
        setEmojiOpen={props.setEmojiOpen}
        onInsertEmoji={props.onInsertEmoji}
      />
      <ComposerQaActions
        isThreadReply={props.isThreadReply}
        isQaChannel={props.isQaChannel}
        effectiveAskAsQuestion={props.effectiveAskAsQuestion}
        effectivePostAnonymously={props.effectivePostAnonymously}
        slashActive={props.slashActive}
        value={props.value}
        setValue={props.setValue}
        setAskAsQuestion={props.setAskAsQuestion}
        setPostAnonymously={props.setPostAnonymously}
      />
    </>
  );
}
