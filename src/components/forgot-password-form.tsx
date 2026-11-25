"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-field";
import {
  forgotPasswordRequestAction,
  forgotPasswordResetAction,
} from "@/lib/auth-actions";

export function ForgotPasswordForm() {
  const t = useTranslations("Forgot");
  const tv = useTranslations("Validation");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", otp: "", newPassword: "" },
  });

  const sendCode = () => {
    startTransition(async () => {
      if (!(await trigger("email"))) return;
      setFormError(null);
      const result = await forgotPasswordRequestAction(getValues("email"), t("failed"));
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setInfo(result.message ?? t("codeSent"));
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
      <Field label={t("email")} error={errors.email?.message}>
        <Input type="email" {...register("email")} autoComplete="email" dir="ltr" readOnly={step === 2} />
      </Field>
      {step === 1 ? (
        <Button type="button" size="lg" onClick={sendCode} disabled={pending}>
          {pending ? t("sending") : t("sendCode")}
        </Button>
      ) : (
        <>
          {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
          <Field label={t("otp")} error={errors.otp?.message}>
            <Input {...register("otp")} inputMode="numeric" maxLength={6} dir="ltr" autoComplete="one-time-code" />
          </Field>
          <Field label={t("newPassword")} error={errors.newPassword?.message}>
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
