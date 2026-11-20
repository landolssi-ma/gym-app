import { Card, CardContent, CardDescription, CardHeader } from "@workspace/ui/components/card"

// The card every settings section uses, in the billing page's design.
export function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-panel border-border-strong shadow-hard-sm">
      <CardHeader>
        <h2 className="font-heading text-2xl font-bold tracking-tight">{title}</h2>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}
