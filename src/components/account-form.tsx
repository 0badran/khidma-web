"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecurityForms } from "@/components/security-forms";
import { CityCombobox } from "@/components/city-combobox";
import { Field, selectClass } from "@/components/form-field";
import {
  deleteAccountAction,
  signPhotoUpload,
  updateProfileAction,
} from "@/lib/account-actions";

type Option = { id: number; nameAr: string; nameEn: string };

export type AccountData = {
  role: "customer" | "provider";
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  customerCityId: number | null;
  provider: {
    categoryId: number;
    governorateId: number;
    cityId: number;
    photoUrl: string | null;
    yearsOfExperience: number | null;
    bio: string | null;
  } | null;
};

export function AccountForm({
  data,
  categories,
  governorates,
}: {
  data: AccountData;
  categories: Option[];
  governorates: Option[];
}) {
  const t = useTranslations("Account");
  const tv = useTranslations("Validation");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState(data.provider?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isProvider = data.role === "provider";
  const name = (o: Option) => (locale === "ar" ? o.nameAr : o.nameEn);

  const schema = z
    .object({
      name: z.string().min(2, tv("minName")).max(100, tv("minName")),
      birthDate: z.string(),
      categoryId: z.string(),
      governorateId: z.string(),
      cityId: z.string(),
      yearsOfExperience: z.string(),
      bio: z.string().max(1000, tv("bio")),
    })
    .superRefine((v, ctx) => {
      if (!isProvider) return;
      if (!v.birthDate) ctx.addIssue({ code: "custom", path: ["birthDate"], message: tv("required") });
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
    setError,
    getValues,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: data.name,
      birthDate: data.birthDate,
      categoryId: String(data.provider?.categoryId ?? ""),
      governorateId: data.provider ? String(data.provider.governorateId) : "",
      cityId: String(data.provider?.cityId ?? data.customerCityId ?? ""),
      yearsOfExperience: data.provider?.yearsOfExperience?.toString() ?? "",
      bio: data.provider?.bio ?? "",
    },
  });

  const governorateId = useWatch({ control, name: "governorateId" });
  const cityId = useWatch({ control, name: "cityId" });

  const onSubmit = (v: Values) => {
    setMessage(null);
    const body: Record<string, unknown> = { name: v.name, birthDate: v.birthDate || null };
    if (!isProvider) body.cityId = v.cityId ? Number(v.cityId) : null;
    if (isProvider) {
      body.categoryId = Number(v.categoryId);
      body.cityId = Number(v.cityId);
      body.yearsOfExperience = v.yearsOfExperience ? Number(v.yearsOfExperience) : null;
      body.bio = v.bio || null;
    }
    startTransition(async () => {
      const result = await updateProfileAction(data.role, body, t("failed"));
      if (result.ok) {
        setMessage({ ok: true, text: t("saved") });
        router.refresh();
        return;
      }
      setMessage({ ok: false, text: result.message });
      for (const [field, messages] of Object.entries(result.fields ?? {})) {
        if (field in v) setError(field as keyof Values, { message: messages[0] });
      }
    });
  };

  const onPhoto = async (file: File) => {
    setMessage(null);
    setUploading(true);
    try {
      const signed = await signPhotoUpload(t("failed"));
      if (!signed.ok) {
        setMessage({ ok: false, text: signed.message });
        return;
      }
      const { uploadUrl, apiKey, signature, params } = signed.sign;
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("signature", signature);
      for (const [key, value] of Object.entries(params)) form.append(key, value);
      const res = await fetch(uploadUrl, { method: "POST", body: form });
      const uploaded = (await res.json()) as { secure_url?: string };
      if (!res.ok || !uploaded.secure_url) {
        setMessage({ ok: false, text: t("uploadFailed") });
        return;
      }
      const saved = await updateProfileAction(
        "provider",
        { photoUrl: uploaded.secure_url },
        t("failed"),
      );
      if (saved.ok) {
        setPhotoUrl(uploaded.secure_url);
        setMessage({ ok: true, text: t("photoSaved") });
        router.refresh();
      } else {
        setMessage({ ok: false, text: saved.message });
      }
    } catch {
      setMessage({ ok: false, text: t("uploadFailed") });
    } finally {
      setUploading(false);
    }
  };

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteAccountAction(t("failed"));
      if (result && !result.ok) setMessage({ ok: false, text: result.message });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {isProvider ? (
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="size-24 shrink-0 object-cover"
            />
          ) : (
            <div className="size-24 shrink-0 bg-muted" />
          )}
          <div className="flex flex-col gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPhoto(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? t("uploading") : photoUrl ? t("changePhoto") : t("addPhoto")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("photoHint")}</span>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label={t("email")}>
          <Input value={data.email} readOnly disabled dir="ltr" />
        </Field>
        <Field label={t("phone")}>
          <Input value={data.phone} readOnly disabled dir="ltr" />
        </Field>
        <Field required label={t("name")} error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field required={isProvider} label={isProvider ? t("birthDate") : t("birthDateOptional")} error={errors.birthDate?.message}>
          <Input type="date" {...register("birthDate")} dir="ltr" />
        </Field>

        {!isProvider ? (
          <Field label={t("cityOptional")}>
            <CityCombobox
              cityId={cityId}
              onSelect={(city) => setValue("cityId", city?.id ?? "")}
              placeholder={t("citySearch")}
              emptyText={t("cityEmpty")}
              ariaLabel={t("city")}
            />
          </Field>
        ) : null}

        {isProvider ? (
          <>
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
                    if (e.target.value && getValues("cityId")) setValue("cityId", "");
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
              <CityCombobox
            cityId={cityId}
            governorateId={governorateId}
            onSelect={(city) => {
              setValue("cityId", city?.id ?? "", { shouldValidate: true });
              if (city) {
                setValue("governorateId", city.governorateId);
              }
            }}
            placeholder={t("citySearch")}
            emptyText={t("cityEmpty")}
            ariaLabel={t("city")}
          />
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
          </>
        ) : null}

        {message ? (
          <p
            role={message.ok ? "status" : "alert"}
            className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}
          >
            {message.text}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending || uploading}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>

      <SecurityForms />

      <section className="flex flex-col gap-3 border border-destructive/30 p-4">
        <h2 className="font-bold text-destructive">{t("deleteTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button variant="destructive" disabled={pending} onClick={onDelete}>
              {t("deleteConfirm")}
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="destructive" className="w-fit" onClick={() => setConfirmDelete(true)}>
            {t("delete")}
          </Button>
        )}
      </section>
    </div>
  );
}
