"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-field";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft-store";
import {
  forgotPasswordRequestAction,
  forgotPasswordResetAction,
} from "@/lib/auth-actions";

export function ForgotPasswordForm() {
  const t = useTranslations("Forgot");
  const tv = useTranslations("Validation");
  const [pending, startTransition] = useTransition();
  const [saved] = useState(() =>
    readDraft<{
      step: 1 | 2;
      values: { email: string; otp: string; newPassword: string };
    }>("forgot-password"),
  );
  const [step, setStep] = useState<1 | 2 | 3>(saved?.step ?? 1);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    email: z.email(tv("email")),
    otp: z.string().regex(/^\d{6}$/, tv("otp")),
    newPassword: z.string().min(8, tv("password")).max(128, tv("password")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: saved?.values ?? { email: "", otp: "", newPassword: "" },
  });
  const allValues = useWatch({ control });

  useEffect(() => {
    if (step === 3) {
      clearDraft("forgot-password");
      return;
    }
    writeDraft("forgot-password", { step, values: allValues });
  }, [step, allValues]);

  const sendCode = () => {
    startTransition(async () => {
      if (!(await trigger("email"))) return;
      setFormError(null);
      const result = await forgotPasswordRequestAction(getValues("email"), t("failed"));
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setStep(2);
    });
  };

  const onSubmit = (v: Values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await forgotPasswordResetAction(v, t("failed"));
      if (result.ok) {
        setStep(3);
        return;
      }
      setFormError(result.message);
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field === "newPassword" || field === "otp") {
          setError(field, { message: messages[0] });
        }
      }
    });
  };

  if (step === 3) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-green-600">
          {t("done")}
        </p>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {t("toLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field required label={t("email")} error={errors.email?.message}>
        <Input type="email" {...register("email")} autoComplete="email" dir="ltr" readOnly={step === 2} />
      </Field>
      {step === 1 ? (
        <Button type="button" size="lg" onClick={sendCode} disabled={pending}>
          {pending ? t("sending") : t("sendCode")}
        </Button>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("codeSent")}</p>
          <Field required label={t("otp")} error={errors.otp?.message}>
            <Input {...register("otp")} inputMode="numeric" maxLength={6} dir="ltr" autoComplete="one-time-code" />
          </Field>
          <Field required label={t("newPassword")} error={errors.newPassword?.message}>
            <Input type="password" {...register("newPassword")} autoComplete="new-password" dir="ltr" />
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t("saving") : t("reset")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep(1)}>
            {t("back")}
          </Button>
        </>
      )}
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
