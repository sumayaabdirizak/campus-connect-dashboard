'use client'

import type { CourseTabDef, CourseTabId } from '@/lib/course-details/config/course-tabs';

interface CourseTabNavProps {
  tabs: CourseTabDef[];
  activeTab: CourseTabId;
  onTabChange: (tab: CourseTabId) => void;
  badges?: Record<string, number>;
}

export function CourseTabNav({ tabs, activeTab, onTabChange, badges }: CourseTabNavProps) {
  return (
    <nav className="p-4 flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-2 rounded ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          {tab.label}
          {badges?.[tab.id] ? ` (${badges[tab.id]})` : ''}
        </button>
      ))}
    </nav>
  );
}

export default CourseTabNav
