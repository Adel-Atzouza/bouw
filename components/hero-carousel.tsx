"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { Icon } from "@/components/icon";
import interiorImage from "@/public/images/hero-interior.jpg";
import kitchenImage from "@/public/images/kitchen.jpg";
import livingRoomImage from "@/public/images/living-room.jpg";

const images = [
  { image: interiorImage, alt: "Lichte verbouwde woning met een houten vloer, open keuken en grote glazen schuifpui", caption: "MEER RUIMTE VOOR HET LEVEN" },
  { image: kitchenImage, alt: "Lichte keuken met marmeren werkblad en warme houten accenten", caption: "HET HART VAN UW THUIS" },
  { image: livingRoomImage, alt: "Zonnige woonkamer met planten en natuurlijke materialen", caption: "EEN PLEK DIE BIJ U PAST" },
];

function subscribeToMotion(callback: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}

function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const pageVisible = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === "visible", () => true);
  const regionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number; index: number } | null>(null);

  const showImage = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = (index + images.length) % images.length;
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
  }, [reducedMotion]);

  useEffect(() => {
    const region = regionRef.current;
    const track = trackRef.current;
    if (!region || !track) return;
    const intersectionObserver = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    const resizeObserver = new ResizeObserver(() => track.scrollTo({ left: activeIndexRef.current * track.clientWidth, behavior: "instant" }));
    intersectionObserver.observe(region);
    resizeObserver.observe(track);
    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (paused || hovered || dragging || reducedMotion || !pageVisible || !inView) return;
    const timeout = window.setTimeout(() => showImage(activeIndex + 1), 6000);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, paused, hovered, dragging, reducedMotion, pageVisible, inView, showImage]);

  function navigate(direction: number) {
    setPaused(true);
    showImage(activeIndexRef.current + direction);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClickRef.current = false;
    setPaused(true);
    if (event.pointerType !== "mouse") return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, index: activeIndexRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(drag.startX - event.clientX) > 5) suppressClickRef.current = true;
    event.currentTarget.scrollLeft = drag.scrollLeft + drag.startX - event.clientX;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    const distance = drag.startX - event.clientX;
    const direction = Math.abs(distance) > 45 ? Math.sign(distance) : 0;
    const nextIndex = event.type === "pointercancel" ? drag.index : drag.index + direction;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (suppressClickRef.current) window.requestAnimationFrame(() => showImage(nextIndex));
  }

  return <div
    ref={regionRef}
    className="hero-visual"
    role="region"
    aria-roledescription="fotogalerij"
    aria-label="Inspiratie voor uw woning"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setPaused(true)}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigate(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}
  >
    <button className="carousel-edge-control carousel-previous" onClick={() => navigate(-1)} aria-label="Vorige inspiratiefoto" />
    <button className="carousel-edge-control carousel-next" onClick={() => navigate(1)} aria-label="Volgende inspiratiefoto" />
    <span className="carousel-counter" aria-hidden="true">0{activeIndex + 1}<span>/</span>03</span>
    <div
      ref={trackRef}
      className={`hero-image-track${dragging ? " is-dragging" : ""}`}
      tabIndex={0}
      role="group"
      aria-label="Inspiratiefoto's, gebruik de pijltjestoetsen om te bladeren"
      onScroll={(event) => {
        const index = Math.max(0, Math.min(images.length - 1, Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth)));
        activeIndexRef.current = index;
        setActiveIndex(index);
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(event) => {
        if (suppressClickRef.current) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = (event.clientX - bounds.left) / bounds.width;
        if (position < 0.2) navigate(-1);
        else if (position > 0.8) navigate(1);
      }}
    >
      {images.map((item, index) => <div className="hero-image-slide" key={item.image.src} aria-hidden={index !== activeIndex}>
        <Image src={item.image} alt={item.alt} fill sizes="(max-width: 760px) 100vw, 52vw" preload={index === 0} loading={index === 0 ? undefined : "eager"} placeholder="blur" draggable={false} className="hero-image" />
      </div>)}
    </div>
    <div className="hero-image-shade" />
    <span className="image-caption" aria-live={paused || reducedMotion ? "polite" : "off"} aria-atomic="true"><span /> {images[activeIndex].caption}</span>
    <div className="hero-float">
      <span className="float-icon"><Icon name="calculator" size={25} /></span>
      <div><strong>Uw woonwens, direct berekend.</strong><span>Wel de mogelijkheden. Geen verrassingen.</span></div>
      <span className="float-check"><Icon name="check" size={17} /></span>
    </div>
  </div>;
}
