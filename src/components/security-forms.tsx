"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-field";
import {
  changeEmailAction,
  changeEmailRequestAction,
  changePasswordAction,
  changePhoneAction,
} from "@/lib/account-actions";
import type { ActionResult } from "@/lib/auth-actions";
import { readDraft, writeDraft } from "@/lib/draft-store";

type Msg = { ok: boolean; text: string } | null;

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role={msg.ok ? "status" : "alert"}
      className={msg.ok ? "text-sm text-green-600" : "text-sm text-destructive"}
    >
      {msg.text}
    </p>
  );
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const run = (
    action: () => Promise<ActionResult>,
    okText: string,
    onOk?: () => void,
  ) => {
    setMsg(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMsg({ ok: true, text: result.message ?? okText });
        onOk?.();
      } else {
        setMsg({ ok: false, text: result.message });
      }
    });
  };
  return { pending, msg, run };
}

function PasswordForm() {
  const t = useTranslations("Security");
  const tv = useTranslations("Validation");
  const { pending, msg, run } = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8 || next.length > 128) {
      setLocalError(tv("password"));
      return;
    }
    setLocalError(null);
    run(
      () => changePasswordAction({ currentPassword: current, newPassword: next }, t("failed")),
      t("passwordChanged"),
      () => {
        setCurrent("");
        setNext("");
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="font-bold">{t("passwordTitle")}</h3>
      <Field required label={t("currentPassword")}>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" dir="ltr" required />
      </Field>
      <Field required label={t("newPassword")} error={localError ?? undefined}>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" dir="ltr" required />
      </Field>
      <Message msg={msg} />
      <Button type="submit" disabled={pending} className="w-fit">
        {t("change")}
      </Button>
    </form>
  );
}

function EmailForm() {
  const t = useTranslations("Security");
  const { pending, msg, run } = useAction();
  const [saved] = useState(() =>
    readDraft<{ step: 1 | 2; newEmail: string; password: string; otp: string }>("change-email"),
  );
  const [step, setStep] = useState<1 | 2>(saved?.step ?? 1);
  const [newEmail, setNewEmail] = useState(saved?.newEmail ?? "");
  const [password, setPassword] = useState(saved?.password ?? "");
  const [otp, setOtp] = useState(saved?.otp ?? "");

  useEffect(() => {
    writeDraft("change-email", { step, newEmail, password, otp });
  }, [step, newEmail, password, otp]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      run(
        () => changeEmailRequestAction({ newEmail, password }, t("failed")),
        t("codeSent"),
        () => setStep(2),
      );
    } else {
      run(
        () => changeEmailAction({ newEmail, otp }, t("emailChanged")),
        t("emailChanged"),
        () => {
          setStep(1);
          setNewEmail("");
          setPassword("");
          setOtp("");
        },
      );
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="font-bold">{t("emailTitle")}</h3>
      <Field required label={t("newEmail")}>
        <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} dir="ltr" required readOnly={step === 2} />
      </Field>
      {step === 1 ? (
        <Field required label={t("currentPassword")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" required />
        </Field>
      ) : (
        <Field required label={t("otp")}>
          <Input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} dir="ltr" required />
        </Field>
      )}
      <Message msg={msg} />
      <Button type="submit" disabled={pending} className="w-fit">
        {step === 1 ? t("sendCode") : t("confirm")}
      </Button>
    </form>
  );
}

function PhoneForm() {
  const t = useTranslations("Security");
  const { pending, msg, run } = useAction();
  const [newPhone, setNewPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => changePhoneAction({ newPhone, password }, t("failed")),
      t("phoneChanged"),
      () => {
        setNewPhone("");
        setPassword("");
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="font-bold">{t("phoneTitle")}</h3>
      <Field required label={t("newPhone")}>
        <Input type="tel" inputMode="tel" placeholder="01012345678" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} dir="ltr" required />
      </Field>
      <Field required label={t("currentPassword")}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" required />
      </Field>
      <Message msg={msg} />
      <Button type="submit" disabled={pending} className="w-fit">
        {t("change")}
      </Button>
    </form>
  );
}

export function SecurityForms() {
  const t = useTranslations("Security");
  return (
    <section className="flex flex-col gap-6 border-t pt-6">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <PasswordForm />
      <EmailForm />
      <PhoneForm />
    </section>
  );
}
