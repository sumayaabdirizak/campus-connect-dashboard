export type AnalyticsPeriod = '3m' | '6m' | '12m'

export const PERIOD_OPTIONS: AnalyticsPeriod[] = ['3m', '6m', '12m']

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
}
