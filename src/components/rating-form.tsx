"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { StarIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-field";
import { submitRatingAction } from "@/lib/account-actions";

export function RatingForm({
  providerId,
  signedIn,
}: {
  providerId: number;
  signedIn: boolean;
}) {
  const t = useTranslations("Rating");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (stars === 0) {
      setMessage({ ok: false, text: t("pickStars") });
      return;
    }
    if (!signedIn && (!name.trim() || !phone.trim())) {
      setMessage({ ok: false, text: t("guestFields") });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await submitRatingAction(
        providerId,
        {
          stars,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
          ...(signedIn ? {} : { name: name.trim(), phone: phone.trim() }),
        },
        t("failed"),
      );
      if (result.ok) {
        setMessage({ ok: true, text: t("thanks") });
        setStars(0);
        setComment("");
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.message });
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border p-4">
      <h3 className="font-bold">{t("title")}</h3>
      <div className="flex gap-1" role="radiogroup" aria-label={t("title")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={String(n)}
            onClick={() => setStars(n)}
            className="p-0.5"
          >
            <StarIcon
              weight={n <= stars ? "fill" : "regular"}
              className={n <= stars ? "size-6 text-amber-500" : "size-6 text-muted-foreground"}
            />
          </button>
        ))}
      </div>
      {signedIn ? null : (
        <>
          <Field required label={t("name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field required label={t("phone")}>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </Field>
        </>
      )}
      <Field label={t("comment")}>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full border border-input bg-transparent p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
      </Field>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}
        >
          {message.text}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
