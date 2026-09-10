import { ArrowRight, Building2, LockKeyhole, ShieldAlert } from 'lucide-react'

import { AuthPageLayout } from '@/components/auth-page-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { tenantAppsUrl, tenantLoginUrl } from '@/lib/oauth-callback'

type AccessUnavailableProps = {
  /** Unauthorized for this app vs generic sign-in/token failure */
  kind?: 'unauthorized' | 'error'
  title?: string
  description: string
  appLabel?: string
  /** Role detected on the token, if any */
  currentAccess?: string | null
  requiredAccess?: string
}

export function AccessUnavailable({
  kind = 'unauthorized',
  title,
  description,
  appLabel = 'Alumni Admin',
  currentAccess,
  requiredAccess = 'ALUMNI_ADMIN',
}: AccessUnavailableProps) {
  const heading =
    title ??
    (kind === 'unauthorized' ? 'You don’t have access to this app' : 'Sign-in could not complete')

  return (
    <AuthPageLayout>
      <Card className="w-full max-w-lg border-0 shadow-lg ring-1 ring-border/60 [--card-spacing:--spacing(6)]">
        <CardHeader className="gap-4">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl ${
              kind === 'unauthorized'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-destructive/15 text-destructive'
            }`}
          >
            {kind === 'unauthorized' ? (
              <LockKeyhole className="size-6" aria-hidden />
            ) : (
              <ShieldAlert className="size-6" aria-hidden />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {appLabel}
            </p>
            <CardTitle className="text-2xl leading-tight font-semibold tracking-tight">
              {heading}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {kind === 'unauthorized' ? (
            <div className="rounded-xl border border-border/80 bg-muted/50 p-4">
              <p className="mb-3 text-sm font-medium">What you need</p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    1
                  </span>
                  <span>
                    Ask your institution admin to assign{' '}
                    <span className="font-mono text-xs text-foreground">{requiredAccess}</span> for{' '}
                    {appLabel}.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    2
                  </span>
                  <span>Return to the tenant workspace and open the app again.</span>
                </li>
              </ul>
              {currentAccess ? (
                <p className="mt-4 rounded-lg bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground ring-1 ring-border/50">
                  Current access on this account:{' '}
                  <span className="text-foreground">{currentAccess}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/50 p-4 text-sm text-muted-foreground">
              <Building2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <p>
                Sign in from your institution’s Taleem workspace, then choose the application you
                are entitled to open.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button nativeButton={false} size="lg" className="h-10 w-full sm:w-auto" render={<a href={tenantAppsUrl()} />}>
            Back to my apps
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="lg"
            className="h-10 w-full sm:w-auto"
            render={<a href={tenantLoginUrl()} />}
          >
            Tenant sign in
          </Button>
        </CardFooter>
      </Card>
    </AuthPageLayout>
  )
}
