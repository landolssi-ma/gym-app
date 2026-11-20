import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card"

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 pt-8 sm:px-6 sm:pt-16">
      <Card>
        <CardHeader>
          <CardTitle>{t("common.notFoundHeading")}</CardTitle>
        </CardHeader>
        <Button className="self-start" asChild>
          <Link href="/">{t("common.notFoundCta")}</Link>
        </Button>
      </Card>
    </main>
  )
}
