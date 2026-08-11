export const REPORT_PALETTE = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  surface: '#F8FAFC',
  border: '#E5E7EB',
  text: '#101828',
  muted: '#667085',
} as const;

export const REPORT_TOOLTIP = {
  borderRadius: 12,
  border: `1px solid ${REPORT_PALETTE.border}`,
  boxShadow: '0 10px 28px rgba(16,24,40,0.1)',
  background: '#fff',
};
