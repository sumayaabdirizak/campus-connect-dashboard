'use client';

import { AgendaView } from './agenda-view';
import { AnnouncementDetailSheet } from './announcement-detail-sheet';
import { CalendarToolbar } from './calendar-toolbar';
import { DaySidebar } from './day-sidebar';
import { EventDialog } from './event-dialog';
import { MonthGrid } from './month-grid';
import { TimeGrid } from './time-grid';
import { useCalendarPage } from './use-calendar-page';

export function CalendarPage() {
  const c = useCalendarPage();

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 max-w-[100vw] overflow-x-hidden rounded-xl border bg-card'>
      <AnnouncementDetailSheet
        detailId={c.detailId}
        onClose={() => c.setDetailId(null)}
      />

      <EventDialog
        open={c.dialogOpen}
        onOpenChange={c.setDialogOpen}
        event={c.editingEvent}
        defaultDate={c.dialogDate}
      />

      {c.view === 'month' ? (
        <DaySidebar
          selectedDay={c.selectedDay}
          selectedItems={c.selectedItems}
          isLoading={c.isLoading}
          onOpenItem={c.openItem}
          onNewEvent={c.openNewEvent}
        />
      ) : null}

      <main className='flex min-h-0 flex-1 flex-col'>
        <CalendarToolbar
          label={c.label}
          view={c.view}
          onView={c.setView}
          onPrev={c.goPrev}
          onNext={c.goNext}
          onToday={c.goToday}
          onNew={() => c.openNewEvent(c.selectedDay)}
          exporting={c.exporting}
          onExportCsv={c.exportCsv}
          onExportIcs={() => void c.exportIcs()}
          kinds={c.kinds}
          onToggleKind={c.toggleKind}
          courses={c.courses}
          hiddenCourses={c.hiddenCourses}
          onToggleCourse={c.toggleCourse}
        />

        {c.view === 'month' ? (
          <MonthGrid
            days={c.days}
            cursor={c.cursor}
            selectedDay={c.selectedDay}
            eventsByDay={c.eventsByDay}
            onSelectDay={c.setSelectedDay}
            onNewEvent={c.openNewEvent}
            onOpenItem={c.openItem}
          />
        ) : c.view === 'agenda' ? (
          <AgendaView items={c.items} onOpen={c.openItem} />
        ) : (
          <TimeGrid
            days={c.view === 'day' ? [c.cursor] : c.days}
            items={c.items}
            onOpen={c.openItem}
            onSlotClick={(date) => c.openNewEvent(date)}
          />
        )}
      </main>
    </div>
  );
}
