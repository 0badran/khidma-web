import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteRatingButton } from "@/components/delete-rating-button";
import { RatingForm } from "@/components/rating-form";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { StarRating } from "@/components/star-rating";
import { getProvider, getRatings, MaintenanceError, pick } from "@/lib/api";
import { PhoneIcon, WhatsappLogoIcon, StarIcon } from "@phosphor-icons/react/dist/ssr";

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("Provider");

  const signedIn = Boolean(await getSessionUser());
  let provider, ratings;
  try {
    [provider, ratings] = await Promise.all([
      getProvider(locale, id),
      getRatings(locale, id, signedIn ? await getAccessToken() : undefined),
    ]);
  } catch (error) {
    if (error instanceof MaintenanceError) {
      return redirect({ href: "/maintenance", locale });
    }
    throw error;
  }
  if (!provider) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row">
        <Image
          src={provider.photoUrl}
          alt={provider.name}
          width={160}
          height={160}
          className="size-40 shrink-0 object-cover"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{provider.name}</h1>
          <Badge variant="secondary" className="w-fit">
            {pick(locale, provider.categoryNameAr, provider.categoryNameEn)}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {pick(locale, provider.cityNameAr, provider.cityNameEn)}،{" "}
            {pick(locale, provider.governorateNameAr, provider.governorateNameEn)}
          </div>
          <div className="flex flex-wrap gap-x-4 text-sm">
            {provider.age != null ? <span>{t("age", { age: provider.age })}</span> : null}
            {provider.yearsOfExperience != null ? (
              <span>{t("experience", { years: provider.yearsOfExperience })}</span>
            ) : null}
          </div>
          <StarRating value={provider.avgRating} count={provider.ratingsCount} />
          <div className="mt-2 flex gap-2">
            <a href={provider.callUrl} className={buttonVariants({ size: "lg" })}>
              <PhoneIcon data-icon="inline-start" />
              {t("call")}
            </a>
            <a
              href={provider.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              <WhatsappLogoIcon data-icon="inline-start" />
              {t("whatsapp")}
            </a>
          </div>
        </div>
      </section>

      {provider.bio ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t("about")}</h2>
          <p className="whitespace-pre-line text-sm leading-7">{provider.bio}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t("ratings")}</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noRatings")}</p>
        ) : (
          ratings.map((rating) => (
            <div key={rating.id} className="flex flex-col gap-1 border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{rating.raterName}</span>
                <span className="flex items-center gap-1">
                  <StarIcon weight="fill" className="size-3.5 text-amber-500" />
                  {rating.stars}
                </span>
              </div>
              {rating.comment ? <p>{rating.comment}</p> : null}
              {rating.mine ? (
                <DeleteRatingButton providerId={provider.id} ratingId={rating.id} />
              ) : null}
            </div>
          ))
        )}
        <RatingForm providerId={provider.id} signedIn={signedIn} />
      </section>
    </main>
  );
}
