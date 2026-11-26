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
import { registerAction, requestRegisterOtp, verifyRegisterOtp } from "@/lib/auth-actions";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft-store";

type Option = { id: number; nameAr: string; nameEn: string };
type City = Option & { governorateId: number };

type Step = "email" | "code" | "details" | "work";
const DRAFT_KEY = "register";
// Survives a reload within the tab. Never holds the password, the code or
// the verification state, so a reload always restarts at the email step.
const SESSION_KEY = "khidma-register";
const SAFE_FIELDS = [
  "role",
  "email",
  "name",
  "phone",
  "categoryId",
  "governorateId",
  "cityId",
] as const;
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

export function RegisterForm({
  categories,
  governorates,
  cities,
}: {
  categories: Option[];
  governorates: Option[];
  cities: City[];
}) {
  const t = useTranslations("Register");
  const tv = useTranslations("Validation");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [saved] = useState(() =>
    readDraft<{ step: Step; values: Values }>(DRAFT_KEY),
  );
  const [step, setStep] = useState<Step>(saved?.step ?? "email");
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const name = (o: Option) => (locale === "ar" ? o.nameAr : o.nameEn);

  const schema = z
    .object({
      role: z.enum(["customer", "provider"]),
      email: z.email(tv("email")),
      name: z.string().min(2, tv("minName")).max(100, tv("minName")),
      phone: z.string().regex(/^\+?\d{8,15}$/, tv("phone")),
      password: z.string().min(8, tv("password")).max(128, tv("password")),
      birthDate: z.string(),
      otp: z.string(),
      categoryId: z.string(),
      governorateId: z.string(),
      cityId: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.role !== "provider") return;
      if (!v.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: tv("required") });
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
    reset,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: saved?.values ?? EMPTY_VALUES,
  });
  const role = useWatch({ control, name: "role" });
  const allValues = useWatch({ control });

  useEffect(() => {
    if (saved) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<Values>;
      reset({ ...EMPTY_VALUES, ...stored });
    } catch {
      // Storage unavailable or corrupt: start empty.
    }
    // Runs once on mount, after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeDraft(DRAFT_KEY, { step, values: allValues });
    try {
      const safe: Record<string, unknown> = {};
      for (const key of SAFE_FIELDS) safe[key] = allValues[key];
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    } catch {
      // Storage unavailable: the in-memory draft still works.
    }
  }, [step, allValues]);

  const governorateId = useWatch({ control, name: "governorateId" });
  const governorateName = new Map(governorates.map((g) => [g.id, name(g)]));
  // All cities are listed. The optional governorate only narrows the list.
  const cityOptions = cities
    .filter((c) => !governorateId || String(c.governorateId) === governorateId)
    .map((c) => ({
      id: c.id,
      label: governorateId
        ? name(c)
        : `${name(c)}, ${governorateName.get(c.governorateId) ?? ""}`,
    }))
    .sort((x, y) => x.label.localeCompare(y.label, locale));

  const isProvider = role === "provider";
  const total = isProvider ? 3 : 2;
  const current = { email: 1, code: 1, details: 2, work: 3 }[step];

  // Stage 1: only the email. A taken email is reported right here.
  const submitEmail = async () => {
    if (!(await trigger("email"))) return;
    setFormError(null);
    startTransition(async () => {
      const result = await requestRegisterOtp(getValues("email"), t("failed"));
      if (!result.ok) {
        setError("email", { message: result.message });
        return;
      }
      setStep("code");
      setCooldown(60);
      setResent(false);
      setTimeout(() => document.querySelector<HTMLInputElement>("input[name=otp]")?.focus(), 50);
    });
  };

  const resendCode = () => {
    if (cooldown > 0) return;
    startTransition(async () => {
      setFormError(null);
      clearErrors("otp");
      const result = await requestRegisterOtp(getValues("email"), t("failed"));
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setValue("otp", "");
      setResent(true);
      setCooldown(60);
    });
  };

  // Stage 2: the code is checked by the API before anything else is asked.
  const submitCode = () => {
    const otp = getValues("otp");
    if (!/^\d{6}$/.test(otp)) {
      setError("otp", { message: tv("otp") });
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await verifyRegisterOtp(getValues("email"), otp, t("failed"));
      if (!result.ok) {
        setError("otp", { message: result.message });
        return;
      }
      setStep("details");
    });
  };

  // Stage 3: a customer creates the account here, a provider continues.
  const submitDetails = async () => {
    const fields: (keyof Values)[] = ["name", "phone", "password"];
    if (getValues("role") === "provider") fields.push("birthDate");
    if (!(await trigger(fields))) return;
    if (getValues("role") === "provider") {
      setStep("work");
      return;
    }
    void handleSubmit(onSubmit)();
  };

  const submitWork = async () => {
    if (!(await trigger(["categoryId", "cityId"]))) return;
    void handleSubmit(onSubmit)();
  };

  const onSubmit = (v: Values) => {
    setFormError(null);
    const body: Record<string, unknown> = {
      role: v.role,
      name: v.name,
      phone: v.phone,
      email: v.email,
      password: v.password,
      otp: v.otp,
    };
    if (v.role === "provider") body.birthDate = v.birthDate;
    if (v.role === "provider") {
      body.categoryId = Number(v.categoryId);
      body.cityId = Number(v.cityId);
    }
    startTransition(async () => {
      const result = await registerAction(body, t("failed"));
      if (!result) return;
      if (result.ok) {
        clearDraft(DRAFT_KEY);
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          // Nothing to clear.
        }
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
      else if (failed.includes("email")) setStep("email");
      else if (failed.includes("otp")) setStep("code");
      else if (failed.length) setStep("details");
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

  if (step === "email" || step === "code") {
    const codeOpen = step === "code";
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (codeOpen) submitCode();
          else void submitEmail();
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
                  <input type="radio" value={value} disabled={codeOpen} {...register("role")} />
                  {t(value)}
                </label>
              ))}
            </div>
          </fieldset>
        <Field required label={t("email")} error={errors.email?.message}>
          <Input
            type="email"
            {...register("email")}
            autoComplete="email"
            dir="ltr"
            autoFocus
            readOnly={codeOpen}
            className={codeOpen ? "bg-muted" : undefined}
          />
        </Field>
        <div
          inert={!codeOpen}
          aria-hidden={!codeOpen}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            codeOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t("codeSent")}</p>
              <Field required label={t("otp")} error={errors.otp?.message}>
                <Input
                  {...register("otp")}
                  inputMode="numeric"
                  maxLength={6}
                  dir="ltr"
                  autoComplete="one-time-code"
                  tabIndex={codeOpen ? 0 : -1}
                />
              </Field>
            </div>
          </div>
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        {codeOpen && resent && !formError ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("resent")}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {codeOpen
            ? pending
              ? t("verifying")
              : t("verify")
            : pending
              ? t("sending")
              : t("sendCode")}
        </Button>
        {codeOpen ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending || cooldown > 0}
            onClick={resendCode}
          >
            {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
          </Button>
        ) : null}
        {codeOpen ? (
          <Button type="button" variant="ghost" onClick={() => setStep("email")}>
            {t("changeEmail")}
          </Button>
        ) : null}
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
        <Field required label={t("category")} error={errors.categoryId?.message}>
          <select {...register("categoryId")} className={selectClass}>
            <option value="">{t("choose")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {name(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("governorateOptional")}>
          <select
            {...register("governorateId", {
              onChange: (e) => {
                const city = cities.find((c) => String(c.id) === getValues("cityId"));
                if (e.target.value && city && String(city.governorateId) !== e.target.value) {
                  setValue("cityId", "");
                }
              },
            })}
            className={selectClass}
          >
            <option value="">{t("allGovernorates")}</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {name(g)}
              </option>
            ))}
          </select>
        </Field>
        <Field required label={t("city")} error={errors.cityId?.message}>
          <select {...register("cityId")} className={selectClass}>
            <option value="">{t("choose")}</option>
            {cityOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
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
          {pending ? t("submitting") : t("submit")}
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
      <Field required label={t("name")} error={errors.name?.message}>
        <Input {...register("name")} autoComplete="name" />
      </Field>
      <Field required label={t("phone")} error={errors.phone?.message}>
        <Input type="tel" {...register("phone")} autoComplete="tel" dir="ltr" />
      </Field>
      {isProvider ? (
        <Field required label={t("birthDate")} error={errors.birthDate?.message}>
          <Input
            type="date"
            {...register("birthDate")}
            dir="ltr"
            className="block min-w-0 max-w-full appearance-none text-start [&::-webkit-date-and-time-value]:text-start"
          />
        </Field>
      ) : null}
      <Field required label={t("password")} error={errors.password?.message}>
        <Input type="password" {...register("password")} autoComplete="new-password" dir="ltr" />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : isProvider ? t("next") : t("submit")}
      </Button>
      {loginLink}
    </form>
  );
}
