import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50/50 border-slate-200 text-center'>
      {Icon && (
        <div className='p-4 rounded-full bg-slate-100 mb-4 text-slate-500'>
          <Icon className='h-10 w-10' />
        </div>
      )}
      <h3 className='text-xl font-bold text-slate-900 mb-2'>{title}</h3>
      <p className='text-slate-500 max-w-sm mx-auto'>{description}</p>
    </div>
  );
}
