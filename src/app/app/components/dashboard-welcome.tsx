function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardWelcome({
  name,
  businessName,
}: {
  name: string | null
  businessName: string
}) {
  const greeting = getTimeBasedGreeting()
  const displayName = name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight text-warm-800">
        {greeting}, {displayName}
      </h1>
      <p className="text-lg text-muted-foreground">
        Here&apos;s what&apos;s happening at{' '}
        <span className="font-medium text-foreground">{businessName}</span>
      </p>
    </div>
  )
}
