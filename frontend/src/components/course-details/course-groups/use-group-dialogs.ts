'use client';

import { useState } from 'react';

export function useGroupDialogs() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (id: number, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };

  const cancelRename = () => setRenamingId(null);

  const startAddMember = (groupId: number) => {
    setAddingTo(groupId);
  };

  const cancelAddMember = () => {
    setAddingTo(null);
  };

  return {
    search,
    setSearch,
    createOpen,
    setCreateOpen,
    deleteId,
    setDeleteId,
    addingTo,
    renamingId,
    renameValue,
    setRenameValue,
    startRename,
    cancelRename,
    startAddMember,
    cancelAddMember
  };
}
