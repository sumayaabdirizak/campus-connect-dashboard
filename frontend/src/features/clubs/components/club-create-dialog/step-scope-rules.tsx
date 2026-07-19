'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ClubJoinPolicy, ClubScopeKind } from '../../api/types'

export function StepScopeRules({
  isDean,
  description,
  rules,
  joinPolicy,
  scopeKind,
  onDescriptionChange,
  onRulesChange,
  onJoinPolicyChange,
  onScopeKindChange,
}: {
  isDean: boolean
  description: string
  rules: string
  joinPolicy: ClubJoinPolicy
  scopeKind: ClubScopeKind
  onDescriptionChange: (v: string) => void
  onRulesChange: (v: string) => void
  onJoinPolicyChange: (v: ClubJoinPolicy) => void
  onScopeKindChange: (v: ClubScopeKind) => void
}) {
  return (
    <div className='space-y-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='club-description'>Description</Label>
        <Textarea
          id='club-description'
          placeholder='What is this club about?'
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='club-rules'>Rules</Label>
        <Textarea
          id='club-rules'
          placeholder='Club rules and guidelines (markdown supported)'
          value={rules}
          onChange={(e) => onRulesChange(e.target.value)}
          maxLength={4000}
          rows={4}
        />
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label>Join Policy</Label>
          <Select
            value={joinPolicy}
            onValueChange={(v) => onJoinPolicyChange(v as ClubJoinPolicy)}
          >
            <SelectTrigger className='h-8 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='OPEN'>Open</SelectItem>
              <SelectItem value='BY_REQUEST'>By Request</SelectItem>
              <SelectItem value='INVITE_ONLY'>Invite Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <Label>Scope</Label>
          <Select
            value={scopeKind}
            onValueChange={(v) => onScopeKindChange(v as ClubScopeKind)}
          >
            <SelectTrigger className='h-8 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='FACULTY'>Faculty</SelectItem>
              {isDean ? <SelectItem value='UNIVERSITY'>University</SelectItem> : null}
              {isDean ? <SelectItem value='CROSS'>Cross-faculty</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
