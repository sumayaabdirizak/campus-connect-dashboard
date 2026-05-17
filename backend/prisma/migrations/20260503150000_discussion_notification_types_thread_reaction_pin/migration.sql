-- Extend DiscussionNotificationType for thread replies, reactions, pins.
ALTER TYPE "DiscussionNotificationType" ADD VALUE 'THREAD';
ALTER TYPE "DiscussionNotificationType" ADD VALUE 'REACTION';
ALTER TYPE "DiscussionNotificationType" ADD VALUE 'PIN';
