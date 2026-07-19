'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { NAME_MAX, TOPIC_MAX, UNCATEGORIZED } from './constants';

interface OverviewFieldsProps {
  name: string;
  setName: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  categoryValue: string;
  setCategoryValue: (v: string) => void;
  categoryChanged: boolean;
  categories: { id: number; name: string }[];
  isArchived: boolean;
  trimmedNameLength: number;
}

export function OverviewFields({
  name,
  setName,
  topic,
  setTopic,
  categoryValue,
  setCategoryValue,
  categoryChanged,
  categories,
  isArchived,
  trimmedNameLength
}: OverviewFieldsProps) {
  return (
    <>
      <div className='space-y-1.5'>
        <Label htmlFor='channel-name' className='text-xs'>
          Name
        </Label>
        <Input
          id='channel-name'
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder='general'
          disabled={isArchived}
          maxLength={NAME_MAX}
        />
        <div className='flex items-center justify-between px-1 text-[10px] text-muted-foreground'>
          <span>
            {trimmedNameLength === 0
              ? 'Required'
              : `${trimmedNameLength}/${NAME_MAX}`}
          </span>
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='channel-topic' className='text-xs'>
          Topic
        </Label>
        <Textarea
          id='channel-topic'
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
          placeholder='What is this channel about?'
          disabled={isArchived}
          rows={3}
          maxLength={TOPIC_MAX}
          className='resize-none'
        />
        <div className='flex items-center justify-between px-1 text-[10px] text-muted-foreground'>
          <span>
            {topic.length}/{TOPIC_MAX}
          </span>
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='channel-category' className='text-xs'>
          Category
        </Label>
        <Select
          value={categoryValue}
          onValueChange={setCategoryValue}
          disabled={isArchived}
        >
          <SelectTrigger id='channel-category' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryChanged ? (
          <p className='px-1 text-[10px] text-muted-foreground'>
            Moving will place this channel at the bottom of the new category.
          </p>
        ) : null}
      </div>
    </>
  );
}
