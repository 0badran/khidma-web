"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/form-field";
import { registerAction, requestRegisterOtp } from "@/lib/auth-actions";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft-store";

type Option = { id: number; nameAr: string; nameEn: string };

type Step = "details" | "work" | "code";
const DRAFT_KEY = "register";
const EMPTY_VALUES = {
  role: "customer",
  email: "",
  name: "",
  phone: "",
  password: "",
  birthDate: "",
  otp: "",
  categoryId: "",
  governorateId: "",
  cityId: "",
} as const;

async function fetchCities(governorateId: string): Promise<Option[]> {
  if (!governorateId) return [];
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/governorates/${governorateId}/cities`,
    );
    return res.ok ? ((await res.json()) as { cities: Option[] }).cities : [];
  } catch {
    return [];
  }
}

export function RegisterForm({
  categories,
  governorates,
}: {
  categories: Option[];
  governorates: Option[];
}) {
  const t = useTranslations("Register");
  const tv = useTranslations("Validation");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [saved] = useState(() =>
    readDraft<{ step: Step; values: Values }>(DRAFT_KEY),
  );
  const [step, setStep] = useState<Step>(saved?.step ?? "details");
  const [formError, setFormError] = useState<string | null>(null);
  const [cities, setCities] = useState<Option[]>([]);

  const name = (o: Option) => (locale === "ar" ? o.nameAr : o.nameEn);

  const schema = z
    .object({
      role: z.enum(["customer", "provider"]),
      email: z.email(tv("email")),
      name: z.string().min(2, tv("minName")).max(100, tv("minName")),
      phone: z.string().regex(/^\+?\d{8,15}$/, tv("phone")),
      password: z.string().min(8, tv("password")).max(128, tv("password")),
      birthDate: z.string().min(1, tv("required")),
      otp: z.string(),
      categoryId: z.string(),
      governorateId: z.string(),
      cityId: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.role !== "provider") return;
      for (const key of ["categoryId", "cityId"] as const) {
        if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message: tv("required") });
      }
    });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: saved?.values ?? EMPTY_VALUES,
  });
  const role = useWatch({ control, name: "role" });
  const allValues = useWatch({ control });

  useEffect(() => {
    writeDraft(DRAFT_KEY, { step, values: allValues });
  }, [step, allValues]);

  // The saved city can only be selected once its option exists.
  const pendingCity = useRef(saved?.values.cityId ?? "");
  useEffect(() => {
    if (cities.length > 0 && pendingCity.current) {
      setValue("cityId", pendingCity.current);
      pendingCity.current = "";
    }
  }, [cities, setValue]);

  useEffect(() => {
    const governorateId = saved?.values.governorateId;
    if (!governorateId) return;
    let cancelled = false;
    fetchCities(governorateId).then((list) => {
      if (!cancelled) setCities(list);
    });
    return () => {
      cancelled = true;
    };
    // Runs once after a language switch to reload the city names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isProvider = role === "provider";
  const total = isProvider ? 3 : 2;
  const current = step === "details" ? 1 : step === "work" ? 2 : total;

  const requestCode = () => {
    startTransition(async () => {
      setFormError(null);
      const result = await requestRegisterOtp(getValues("email"), t("failed"));
      if (!result.ok) {
        setError("email", { message: result.message });
        setStep("details");
        return;
      }
      setStep("code");
    });
  };

  // Details stage: a customer goes straight to the code, a provider
  // continues to the work stage first.
  const submitDetails = async () => {
    const fields: (keyof Values)[] = ["email", "name", "phone", "birthDate", "password"];
    if (!(await trigger(fields))) return;
    if (getValues("role") === "provider") {
      setStep("work");
      return;
    }
    requestCode();
  };

  const submitWork = async () => {
    if (!(await trigger(["categoryId", "cityId"]))) return;
    requestCode();
  };

  const loadCities = async (governorateId: string) => {
    setCities([]);
    setValue("cityId", "");
    setCities(await fetchCities(governorateId));
  };

  const onSubmit = (v: Values) => {
    setFormError(null);
    if (!/^\d{6}$/.test(v.otp)) {
      setError("otp", { message: tv("otp") });
      return;
    }
    const body: Record<string, unknown> = {
      role: v.role,
      name: v.name,
      phone: v.phone,
      email: v.email,
      password: v.password,
      birthDate: v.birthDate,
      otp: v.otp,
    };
    if (v.role === "provider") {
      body.categoryId = Number(v.categoryId);
      body.cityId = Number(v.cityId);
    }
    startTransition(async () => {
      const result = await registerAction(body, t("failed"));
      if (!result) return;
      if (result.ok) {
        clearDraft(DRAFT_KEY);
        return;
      }
      setFormError(result.message);
      const fieldErrors = Object.entries(result.fields ?? {}).filter(
        ([field]) => field in v,
      );
      for (const [field, messages] of fieldErrors) {
        setError(field as keyof Values, { message: messages[0] });
      }
      // A problem in an earlier stage sends the user back to fix it.
      const failed = fieldErrors.map(([field]) => field);
      if (failed.some((f) => f === "categoryId" || f === "cityId")) setStep("work");
      else if (failed.some((f) => f !== "otp")) setStep("details");
    });
  };

  const loginLink = (
    <p className="text-center text-sm text-muted-foreground">
      {t("haveAccount")}{" "}
      <Link href="/login" className="text-primary underline-offset-4 hover:underline">
        {t("login")}
      </Link>
    </p>
  );

  const progress = (
    <p className="text-sm text-muted-foreground">{t("stepOf", { current, total })}</p>
  );

  if (step === "code") {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {progress}
        <p className="text-sm text-muted-foreground">{t("codeSent")}</p>
        <Field label={t("otp")} error={errors.otp?.message}>
          <Input
            {...register("otp")}
            inputMode="numeric"
            maxLength={6}
            dir="ltr"
            autoComplete="one-time-code"
            autoFocus
          />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(isProvider ? "work" : "details")}
        >
          {t("back")}
        </Button>
        {loginLink}
      </form>
    );
  }

  if (step === "work") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitWork();
        }}
        className="flex flex-col gap-4"
      >
        {progress}
        <Field label={t("category")} error={errors.categoryId?.message}>
          <select {...register("categoryId")} className={selectClass}>
            <option value="">{t("choose")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {name(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("governorate")}>
          <select
            {...register("governorateId", {
              onChange: (e) => loadCities(e.target.value),
            })}
            className={selectClass}
          >
            <option value="">{t("choose")}</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {name(g)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("city")} error={errors.cityId?.message}>
          <select {...register("cityId")} className={selectClass} disabled={cities.length === 0}>
            <option value="">{t("choose")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {name(c)}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-muted-foreground">{t("profileLater")}</p>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("sending") : t("sendCode")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep("details")}>
          {t("back")}
        </Button>
        {loginLink}
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submitDetails();
      }}
      className="flex flex-col gap-4"
    >
      {progress}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("role")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "provider"] as const).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 border p-3 text-sm has-checked:border-primary has-checked:bg-muted"
            >
              <input type="radio" value={value} {...register("role")} />
              {t(value)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("name")} error={errors.name?.message}>
        <Input {...register("name")} autoComplete="name" />
      </Field>
      <Field label={t("email")} error={errors.email?.message}>
        <Input type="email" {...register("email")} autoComplete="email" dir="ltr" />
      </Field>
      <Field label={t("phone")} error={errors.phone?.message}>
        <Input type="tel" {...register("phone")} autoComplete="tel" dir="ltr" />
      </Field>
      <Field label={t("birthDate")} error={errors.birthDate?.message}>
        <Input
          type="date"
          {...register("birthDate")}
          dir="ltr"
          className="block min-w-0 max-w-full appearance-none text-start [&::-webkit-date-and-time-value]:text-start"
        />
      </Field>
      <Field label={t("password")} error={errors.password?.message}>
        <Input type="password" {...register("password")} autoComplete="new-password" dir="ltr" />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("sending") : isProvider ? t("next") : t("sendCode")}
      </Button>
      {loginLink}
    </form>
  );
}
