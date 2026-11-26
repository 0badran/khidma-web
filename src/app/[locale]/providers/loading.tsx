import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const t = useTranslations("Loading");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 py-8">
      <p className="text-sm text-muted-foreground">{t("preparing")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </main>
  );
}
