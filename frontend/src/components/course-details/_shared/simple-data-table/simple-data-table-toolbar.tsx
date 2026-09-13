import { Button } from '@/features/ui/components/button';
import { Download } from 'lucide-react';
import { CourseTabSearch } from '../course-tab-search';

interface SimpleDataTableToolbarProps {
  searchPlaceholder: string;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  toolbarRight?: React.ReactNode;
  onExport: (() => void) | null;
  showSearch?: boolean;
}

export function SimpleDataTableToolbar({
  searchPlaceholder,
  globalFilter,
  onGlobalFilterChange,
  toolbarRight,
  onExport,
  showSearch = true
}: SimpleDataTableToolbarProps) {
  return (
    <div className='flex flex-wrap items-center justify-end gap-2'>
      {toolbarRight}
      {onExport ? (
        <Button variant='outline' size='sm' className='gap-1.5' onClick={onExport}>
          <Download className='size-4' aria-hidden />
          Export CSV
        </Button>
      ) : null}
      {showSearch ? (
        <CourseTabSearch
          value={globalFilter}
          onChange={onGlobalFilterChange}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      ) : null}
    </div>
  );
}
