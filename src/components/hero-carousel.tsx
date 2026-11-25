"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

export type HeroSlide = {
  id: string | number;
  imageUrl: string;
  titleAr: string | null;
  titleEn: string | null;
  linkUrl: string | null;
  remote: boolean;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const locale = useLocale();
  const t = useTranslations("Hero");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      dir={dir}
      setApi={setApi}
      opts={{ loop: true, direction: dir }}
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]}
      aria-label={t("label")}
      className="group"
    >
      <CarouselContent className="ms-0">
        {slides.map((slide, index) => {
          const title = locale === "ar" ? slide.titleAr : slide.titleEn;
          const href = slide.linkUrl ?? "/providers";
          const internal = href.startsWith("/");
          const cta = (
            <span className={buttonVariants({ size: "lg" })}>{t("cta")}</span>
          );
          return (
            <CarouselItem key={slide.id} className="ps-0">
              <div className="relative aspect-4/3 w-full overflow-hidden md:aspect-21/9">
                <Image
                  src={slide.imageUrl}
                  alt={title ?? ""}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  priority={index === 0}
                  unoptimized={slide.remote}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-5xl flex-col items-start gap-3 p-4 pb-8 md:p-8 md:pb-10">
                  {title ? (
                    <h2 className="max-w-xl text-xl font-bold text-white md:text-4xl">{title}</h2>
                  ) : null}
                  {internal ? (
                    <Link href={href}>{cta}</Link>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {cta}
                    </a>
                  )}
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      {slides.length > 1 ? (
        <>
          <CarouselPrevious className="start-2 hidden md:inline-flex" />
          <CarouselNext className="end-2 hidden md:inline-flex" />
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 md:bottom-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t("goTo", { number: index + 1 })}
                aria-current={index === current}
                onClick={() => api?.scrollTo(index)}
                className={
                  index === current
                    ? "h-1.5 w-6 bg-white"
                    : "h-1.5 w-1.5 bg-white/50"
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </Carousel>
  );
}
