"use client";

import { useEffect, useState, useTransition } from "react";
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
  yearsOfExperience: "",
  bio: "",
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
    readDraft<{ step: 1 | 2; values: Values }>(DRAFT_KEY),
  );
  const [step, setStep] = useState<1 | 2>(saved?.step ?? 1);
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
      yearsOfExperience: z.string(),
      bio: z.string().max(1000, tv("bio")),
    })
    .superRefine((v, ctx) => {
      if (v.role !== "provider") return;
      for (const key of ["categoryId", "cityId"] as const) {
        if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message: tv("required") });
      }
      if (v.yearsOfExperience) {
        const n = Number(v.yearsOfExperience);
        if (!Number.isInteger(n) || n < 0 || n > 60) {
          ctx.addIssue({ code: "custom", path: ["yearsOfExperience"], message: tv("years") });
        }
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

  useEffect(() => {
    const governorateId = saved?.values.governorateId;
    if (!governorateId) return;
    let cancelled = false;
    fetchCities(governorateId).then((list) => {
      if (cancelled) return;
      setCities(list);
      setValue("cityId", saved.values.cityId);
    });
    return () => {
      cancelled = true;
    };
    // Runs once after a language switch to reload the city names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = () => {
    startTransition(async () => {
      const fields: (keyof Values)[] = ["email", "name", "phone", "birthDate", "password", "bio"];
      if (getValues("role") === "provider") {
        fields.push("categoryId", "cityId", "yearsOfExperience");
      }
      if (!(await trigger(fields))) return;
      setFormError(null);
      const result = await requestRegisterOtp(getValues("email"), t("failed"));
      if (!result.ok) {
        setError("email", { message: result.message });
        return;
      }
      setStep(2);
    });
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
      if (v.yearsOfExperience) body.yearsOfExperience = Number(v.yearsOfExperience);
      if (v.bio) body.bio = v.bio;
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
      // A problem in a details field means the user must go back and fix it.
      if (fieldErrors.some(([field]) => field !== "otp")) setStep(1);
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

  if (step === 2) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
        <Button type="button" variant="ghost" onClick={() => setStep(1)}>
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
        sendCode();
      }}
      className="flex flex-col gap-4"
    >
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

      {role === "provider" ? (
        <>
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
          <Field label={t("years")} error={errors.yearsOfExperience?.message}>
            <Input type="number" min={0} max={60} {...register("yearsOfExperience")} dir="ltr" />
          </Field>
          <Field label={t("bio")} error={errors.bio?.message}>
            <textarea
              {...register("bio")}
              rows={4}
              className="w-full border border-input bg-transparent p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </Field>
          <p className="text-xs text-muted-foreground">{t("photoLater")}</p>
        </>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("sending") : t("sendCode")}
      </Button>
      {loginLink}
    </form>
  );
}
