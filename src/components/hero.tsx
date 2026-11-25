import { getLocale } from "next-intl/server";
import { HeroCarousel, type HeroSlide } from "@/components/hero-carousel";
import { getBanners } from "@/lib/api";

// Shown when the API has no banners yet.
const builtInSlides: HeroSlide[] = [
  {
    id: "plumber",
    imageUrl: "/hero/plumber.webp",
    titleAr: "سباكة وصيانة من فنيين موثقين",
    titleEn: "Plumbing and repairs by verified technicians",
    linkUrl: null,
    remote: false,
  },
  {
    id: "electrician",
    imageUrl: "/hero/electrician.webp",
    titleAr: "كهرباء وتركيبات آمنة لبيتك",
    titleEn: "Safe electrical work for your home",
    linkUrl: null,
    remote: false,
  },
  {
    id: "ac",
    imageUrl: "/hero/ac.webp",
    titleAr: "غسيل وصيانة التكييف",
    titleEn: "AC cleaning and maintenance",
    linkUrl: null,
    remote: false,
  },
  {
    id: "painter",
    imageUrl: "/hero/painter.webp",
    titleAr: "دهان ونجارة بإيد أسطوات",
    titleEn: "Painting and carpentry by skilled craftsmen",
    linkUrl: null,
    remote: false,
  },
];

export async function Hero() {
  const locale = await getLocale();
  const banners = await getBanners(locale);
  const slides: HeroSlide[] =
    banners.length > 0
      ? banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          titleAr: b.titleAr,
          titleEn: b.titleEn,
          linkUrl: b.linkUrl,
          remote: true,
        }))
      : builtInSlides;
  return <HeroCarousel slides={slides} />;
}
