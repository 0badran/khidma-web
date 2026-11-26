"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteRatingAction } from "@/lib/account-actions";

export function DeleteRatingButton({
  providerId,
  ratingId,
}: {
  providerId: number;
  ratingId: number;
}) {
  const t = useTranslations("Rating");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteRatingAction(providerId, ratingId, t("deleteFailed"));
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
            {t("deleteConfirm")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setConfirming(true)}>
          {t("delete")}
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
