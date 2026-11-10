'use client'

interface Props {
  entries: { watched_on: string }[]
}

const DAYS = ['', 'L', '', 'M', '', 'V', '']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function getColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-primary/30'
  if (count === 2) return 'bg-primary/55'
  if (count === 3) return 'bg-primary/75'
  return 'bg-primary'
}

export function ActivityHeatmap({ entries }: Props) {
  // Build a map date -> count
  const countByDate: Record<string, number> = {}
  for (const e of entries) {
    countByDate[e.watched_on] = (countByDate[e.watched_on] ?? 0) + 1
  }

  // Build 52 weeks grid ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Start from the Sunday 52 weeks ago
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 52 * 7 - today.getDay())

  const weeks: { date: string; count: number }[][] = []
  let week: { date: string; count: number }[] = []
  const cursor = new Date(startDate)
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1

  for (let i = 0; i < 52 * 7 + 7; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    const count = countByDate[dateStr] ?? 0
    week.push({ date: dateStr, count })

    const month = cursor.getMonth()
    if (cursor.getDay() === 0 && month !== lastMonth) {
      monthLabels.push({ label: MONTHS[month], col: weeks.length })
      lastMonth = month
    }

    if (cursor.getDay() === 6) {
      weeks.push(week)
      week = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (week.length > 0) weeks.push(week)

  const totalThisYear = entries.length

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{totalThisYear} match{totalThisYear !== 1 ? 's' : ''} ces 12 derniers mois</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Moins</span>
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-primary/30" />
          <div className="h-3 w-3 rounded-sm bg-primary/55" />
          <div className="h-3 w-3 rounded-sm bg-primary/75" />
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span>Plus</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 pl-6">
            {weeks.map((_, i) => {
              const ml = monthLabels.find(m => m.col === i)
              return (
                <div key={i} className="w-3 text-[9px] text-muted-foreground">
                  {ml ? ml.label : ''}
                </div>
              )
            })}
          </div>
          {/* Grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-1">
              {DAYS.map((d, i) => (
                <div key={i} className="h-3 text-[9px] text-muted-foreground leading-3">{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`h-3 w-3 rounded-sm transition-colors ${getColor(day.count)}`}
                    title={`${day.date}: ${day.count} match${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
