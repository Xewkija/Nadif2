import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function BusinessOverviewCard({
  name,
  slug,
  role,
}: {
  name: string
  slug: string
  role: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
            <p className="text-sm text-muted-foreground">nadif.app/{slug}</p>
          </div>
          <Badge
            variant="secondary"
            className="bg-warm-100 text-warm-800 hover:bg-warm-200 capitalize"
          >
            {role}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
