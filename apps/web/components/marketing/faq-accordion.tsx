import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { cn } from "@workspace/ui/lib/utils"

// The homepage uses framed rows; other FAQs keep the compact shared treatment.
export function FaqAccordion({
  items,
  variant = "plain",
}: {
  items: readonly { question: string; answer: string }[]
  variant?: "plain" | "framed"
}) {
  const framed = variant === "framed"
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={items[0]?.question}
      className={framed ? "gap-3" : undefined}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.question}
          value={item.question}
          className={cn(
            framed &&
              "overflow-hidden rounded-lg border-2 border-border-strong bg-card shadow-[4px_4px_0_var(--border)] not-last:border-b-2 data-[state=open]:shadow-[4px_4px_0_var(--butter)]"
          )}
        >
          <AccordionTrigger
            className={cn(
              "font-heading text-lg font-bold",
              framed &&
                "items-center gap-4 px-5.5 py-5 text-left text-subtitle leading-(--leading-quote) tracking-(--tracking-question) after:inline-flex after:size-6.5 after:flex-none after:items-center after:justify-center after:rounded-control after:border-(length:--border-width-fine) after:border-border-strong after:bg-card after:text-xl after:leading-none after:transition-transform after:duration-(--duration-normal) after:ease-(--ease-out) after:content-['+'] aria-expanded:after:rotate-45 aria-expanded:after:bg-butter max-compact:p-4.5 max-compact:text-copy [&_svg]:hidden!"
            )}
          >
            {item.question}
          </AccordionTrigger>
          <AccordionContent
            className={cn(
              "text-base text-muted-foreground",
              framed && "px-5.5"
            )}
          >
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
