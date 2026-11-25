import { getTranslations } from "next-intl/server";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";

export async function StarRating({
  value,
  count,
}: {
  value: number | null;
  count: number;
}) {
  const t = await getTranslations("Provider");
  if (value == null) {
    return <div className="text-xs text-muted-foreground">{t("noRatings")}</div>;
  }
  return (
    <div className="flex items-center gap-1 text-xs">
      <StarIcon weight="fill" className="size-3.5 text-amber-500" />
      <span className="font-medium">{value.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}
