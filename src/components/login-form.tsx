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
import { loginAction } from "@/lib/auth-actions";

export function LoginForm() {
  const t = useTranslations("Login");
  const tv = useTranslations("Validation");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    identifier: z.string().min(1, tv("required")),
    password: z.string().min(1, tv("required")),
  });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = (values: Values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(values, t("failed"));
      if (result && !result.ok) setFormError(result.message);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field required label={t("identifier")} error={errors.identifier?.message}>
        <Input {...register("identifier")} autoComplete="username" dir="ltr" />
      </Field>
      <Field required label={t("password")} error={errors.password?.message}>
        <Input
          type="password"
          {...register("password")}
          autoComplete="current-password"
          dir="ltr"
        />
      </Field>
      <Link href="/forgot-password" className="w-fit text-sm text-primary underline-offset-4 hover:underline">
        {t("forgot")}
      </Link>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
