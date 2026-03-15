import { CreateBusinessForm } from './create-business-form'

export function OnboardingShell() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12 md:px-10 md:py-16">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left column — Context */}
        <div className="space-y-6 lg:space-y-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Getting started
          </p>

          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Welcome to Nadif
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed">
            Your cleaning business, simplified. Create your business to start managing operations.
          </p>

          <ul className="space-y-3 text-muted-foreground">
            <li>Manage bookings and scheduling</li>
            <li>Track customers and service addresses</li>
            <li>Coordinate your cleaning staff</li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Takes less than a minute.
          </p>
        </div>

        {/* Right column — Form */}
        <div>
          <CreateBusinessForm />
        </div>
      </div>
    </div>
  )
}
