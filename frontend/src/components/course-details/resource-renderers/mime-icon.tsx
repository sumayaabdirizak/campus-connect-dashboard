import {
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileType2,
  FileCode2,
  Music
} from 'lucide-react';

export function MimeIcon({
  mime,
  className = 'w-8 h-8 text-muted-foreground shrink-0'
}: {
  mime: string | null | undefined;
  className?: string;
}) {
  const m = (mime ?? '').toLowerCase();
  if (m.startsWith('image/')) return <ImageIcon className={className} />;
  if (m.startsWith('audio/')) return <Music className={className} />;
  if (m.startsWith('video/')) return <VideoIcon className={className} />;
  if (m.includes('pdf')) return <FileType2 className={className} />;
  if (m.includes('zip') || m.includes('compressed') || m.includes('rar') || m.includes('7z'))
    return <FileArchive className={className} />;
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv'))
    return <FileSpreadsheet className={className} />;
  if (m.includes('javascript') || m.includes('json') || m.includes('xml') || m.includes('html'))
    return <FileCode2 className={className} />;
  return <FileText className={className} />;
}
