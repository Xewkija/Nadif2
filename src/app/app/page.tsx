import { getCurrentTenantContext } from '@/lib/supabase/server'
import { OnboardingShell } from './components/onboarding-shell'
import { DashboardWelcome } from './components/dashboard-welcome'
import { GettingStartedCard } from './components/getting-started-card'
import { BusinessOverviewCard } from './components/business-overview-card'

export default async function AppPage() {
  const tenantContext = await getCurrentTenantContext()

  if (!tenantContext) {
    return <OnboardingShell />
  }

  const { profile, membership, tenant } = tenantContext

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <DashboardWelcome
        name={profile.full_name}
        businessName={tenant.name}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting Started - takes 2 columns */}
        <div className="lg:col-span-2">
          <GettingStartedCard />
        </div>

        {/* Business Overview - takes 1 column */}
        <div>
          <BusinessOverviewCard
            name={tenant.name}
            slug={tenant.slug}
            role={membership.role}
          />
        </div>
      </div>
    </div>
  )
}
