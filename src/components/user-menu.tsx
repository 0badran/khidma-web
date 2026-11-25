import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";
import { getSessionUser } from "@/lib/session";

export async function UserMenu() {
  const t = await getTranslations("Header");
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          {t("login")}
        </Link>
        <Link href="/register" className={buttonVariants()}>
          {t("register")}
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="text-muted-foreground">{user.name}</span>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          {t("logout")}
        </Button>
      </form>
    </>
  );
}
