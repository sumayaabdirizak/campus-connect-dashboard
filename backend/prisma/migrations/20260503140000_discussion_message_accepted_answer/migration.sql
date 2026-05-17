-- Q&A: moderator/TA can mark one reply per thread as the accepted answer.
ALTER TABLE "DiscussionMessage" ADD COLUMN "isAcceptedAnswer" BOOLEAN NOT NULL DEFAULT false;
