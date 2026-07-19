'use client';

export function AiHowItWorks({ isNewQuiz }: { isNewQuiz: boolean }) {
  return (
    <div className='rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1'>
      <p className='font-medium text-foreground'>How this works</p>
      {isNewQuiz ? (
        <p>
          Nothing is saved yet. After generating, you&apos;ll see every question and
          choose which to keep. Selected questions become a new{' '}
          <strong>draft quiz</strong> — you&apos;ll land in the builder to fine-tune and
          publish it when ready.
        </p>
      ) : (
        <p>
          Nothing is saved yet. After generating, you&apos;ll see every question and
          choose which to keep. Selected questions land in your{' '}
          <strong>Question Bank</strong> for this course — you can then drop them into any
          quiz via &quot;Add from Bank&quot;.
        </p>
      )}
    </div>
  );
}
