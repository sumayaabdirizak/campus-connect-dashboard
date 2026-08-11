import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Download, Search } from 'lucide-react';

interface SimpleDataTableToolbarProps {
  searchPlaceholder: string;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  toolbarRight?: React.ReactNode;
  onExport: (() => void) | null;
}

export function SimpleDataTableToolbar({
  searchPlaceholder,
  globalFilter,
  onGlobalFilterChange,
  toolbarRight,
  onExport
}: SimpleDataTableToolbarProps) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='relative min-w-[180px] max-w-xs flex-1'>
        <Search
          className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden
        />
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className='h-9 pl-9'
          aria-label={searchPlaceholder}
        />
      </div>
      {toolbarRight}
      {onExport && (
        <Button variant='outline' size='sm' className='ml-auto gap-1.5' onClick={onExport}>
          <Download className='size-4' aria-hidden />
          Export CSV
        </Button>
      )}
    </div>
  );
}
