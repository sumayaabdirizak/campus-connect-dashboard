'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadResourceFile } from '../api/resources-queries';
import { uploadResourceFile } from '../api/resources-service';
import type {
  CourseModule,
  CreateResourceData,
  Resource,
  ResourceType,
  UpdateResourceData
} from '../api/resources-types';
import { humanizeType } from './resource-renderers';
import { ResourceRecorder } from './resource-recorder';
import type { RecordingMode } from '../hooks/use-media-recorder';

const RESOURCE_TYPES: ResourceType[] = [
  'SYLLABUS',
  'ASSIGNMENT',
  'LECTURE_NOTE',
  'VIDEO',
  'AUDIO',
  'EXTERNAL_LINK',
  'OTHER'
];

interface ResourceFormState {
  title: string;
  description: string;
  url: string;
  type: ResourceType;
  originalName: string | null;
  mimeType: string | null;
  moduleId: number | null;
  is_draft: boolean;
}

const blankForm: ResourceFormState = {
  title: '',
  description: '',
  url: '',
  type: 'LECTURE_NOTE',
  originalName: null,
  mimeType: null,
  moduleId: null,
  is_draft: false
};

function inferTypeFromMime(mime: string): ResourceType {
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.includes('pdf')) return 'LECTURE_NOTE';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'LECTURE_NOTE';
  return 'OTHER';
}

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Resource | null;
  modules: CourseModule[];
  defaultModuleId?: number | null;
  pending: boolean;
  onSubmit: (
    payload:
      | { mode: 'create'; data: Omit<CreateResourceData, 'teacherId'> & { is_draft?: boolean } }
      | { mode: 'edit'; resourceId: number; data: UpdateResourceData }
  ) => void;
}

/**
 * Create / edit dialog for course resources.
 *
 * Create mode exposes three ways to provide a file:
 *   1. Upload from disk (existing flow)
 *   2. Record audio — mic → blob → upload → populate form
 *   3. Record video — camera+mic → blob → upload → populate form
 *
 * All three paths converge on the same `url` / `originalName` / `mimeType`
 * form fields, so the save logic is identical regardless of how the file
 * was obtained. In edit mode only the URL text box is shown (re-uploading
 * would orphan the previous file on disk).
 */
export function ResourceFormDialog({
  open,
  onOpenChange,
  editing,
  modules,
  defaultModuleId,
  pending,
  onSubmit
}: ResourceFormDialogProps) {
  const [form, setForm] = useState<ResourceFormState>(blankForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadResourceFile();

  const initFor = (resource: Resource | null) => {
    if (resource) {
      setForm({
        title: resource.title,
        description: resource.description ?? '',
        url: resource.url,
        type: resource.type,
        originalName: resource.originalName,
        mimeType: resource.mimeType,
        moduleId: resource.moduleId,
        is_draft: resource.is_draft
      });
    } else {
      setForm({ ...blankForm, moduleId: defaultModuleId ?? null });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    if (next) initFor(editing);
    onOpenChange(next);
  };

  // ── Shared handler: file upload result → form state ──────────────────────

  const applyUploadResult = (
    result: { url: string; originalName: string; mimeType: string },
    autoTitle?: string
  ) => {
    setForm((prev) => ({
      ...prev,
      url: result.url,
      originalName: result.originalName,
      mimeType: result.mimeType,
      title: prev.title.trim() ? prev.title : (autoTitle ?? result.originalName),
      type: inferTypeFromMime(result.mimeType)
    }));
  };

  // ── File picker ───────────────────────────────────────────────────────────

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 100 MB limit`);
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: (result) => {
        applyUploadResult(result);
        toast.success(`Uploaded "${result.originalName}"`);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  // ── Recorder callback ─────────────────────────────────────────────────────

  const handleRecorded = (
    result: { url: string; originalName: string; mimeType: string; mode: RecordingMode }
  ) => {
    const label = result.mode === 'audio' ? 'Voice note' : 'Video recording';
    applyUploadResult(result, label);
    toast.success(`${label} ready`);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Title and a file or URL are required');
      return;
    }
    if (editing) {
      onSubmit({
        mode: 'edit',
        resourceId: editing.id,
        data: {
          title: form.title,
          description: form.description,
          url: form.url,
          type: form.type,
          is_draft: form.is_draft,
          moduleId: form.moduleId
        }
      });
    } else {
      onSubmit({
        mode: 'create',
        data: {
          title: form.title,
          description: form.description || undefined,
          url: form.url,
          type: form.type,
          originalName: form.originalName,
          mimeType: form.mimeType,
          moduleId: form.moduleId,
          is_draft: form.is_draft
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit material' : 'Add material'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 py-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='resource-title'>Title</Label>
            <Input
              id='resource-title'
              placeholder='e.g. Chapter 3 — Slides'
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='resource-description'>Description</Label>
            <Textarea
              id='resource-description'
              placeholder='Optional — context, learning objectives, source attribution…'
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          {!editing && (
            <>
              {/* ── Upload from disk ─────────────────────────────────────── */}
              <div className='space-y-2'>
                <Label>File</Label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,application/zip,image/*,video/*,audio/*,text/*'
                  onChange={handlePickFile}
                  className='hidden'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='gap-1.5 w-full'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  <Upload className='w-4 h-4' />
                  {uploadMutation.isPending
                    ? 'Uploading…'
                    : form.originalName
                      ? `Replace file (${form.originalName})`
                      : 'Upload file'}
                </Button>
                {form.originalName && form.mimeType && (
                  <p className='text-[10px] text-muted-foreground'>
                    {form.originalName} · {form.mimeType}
                  </p>
                )}
              </div>

              {/* ── Record audio / video ─────────────────────────────────── */}
              <div className='space-y-1.5'>
                <Label>Record</Label>
                <ResourceRecorder
                  uploadFn={uploadResourceFile}
                  uploading={uploadMutation.isPending}
                  onUploaded={handleRecorded}
                  onUploadError={(msg) => toast.error(msg)}
                />
              </div>

              <div className='flex items-center gap-2'>
                <Separator className='flex-1' />
                <span className='text-[10px] text-muted-foreground'>or paste a link</span>
                <Separator className='flex-1' />
              </div>
            </>
          )}

          <div className='space-y-1.5'>
            <Label htmlFor='resource-url'>URL</Label>
            <Input
              id='resource-url'
              placeholder='Paste a link to a video, doc, etc.'
              value={form.url}
              onChange={(e) =>
                setForm({ ...form, url: e.target.value, originalName: null, mimeType: null })
              }
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ResourceType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanizeType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label>Module</Label>
              <Select
                value={form.moduleId == null ? '__none__' : String(form.moduleId)}
                onValueChange={(v) =>
                  setForm({ ...form, moduleId: v === '__none__' ? null : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>Ungrouped</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex items-center justify-between rounded-md border p-3'>
            <div>
              <p className='text-sm font-medium'>Save as draft</p>
              <p className='text-[11px] text-muted-foreground'>
                Drafts are visible to teachers only.
              </p>
            </div>
            <Switch
              checked={form.is_draft}
              onCheckedChange={(checked) => setForm({ ...form, is_draft: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || uploadMutation.isPending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
