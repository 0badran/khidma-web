import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { pick, type Provider } from "@/lib/api";

export async function ProviderCard({ provider }: { provider: Provider }) {
  const locale = await getLocale();
  const t = await getTranslations("Provider");
  return (
    <Link href={`/providers/${provider.id}`} className="block">
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="flex gap-3">
          <Image
            src={provider.photoUrl}
            alt={provider.name}
            width={72}
            height={72}
            className="size-18 shrink-0 object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="truncate font-bold">{provider.name}</div>
            <Badge variant="secondary" className="w-fit">
              {pick(locale, provider.categoryNameAr, provider.categoryNameEn)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {pick(locale, provider.cityNameAr, provider.cityNameEn)}،{" "}
              {pick(locale, provider.governorateNameAr, provider.governorateNameEn)}
            </div>
            <StarRating value={provider.avgRating} count={provider.ratingsCount} />
            {provider.yearsOfExperience != null ? (
              <div className="text-xs text-muted-foreground">
                {t("experience", { years: provider.yearsOfExperience })}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
