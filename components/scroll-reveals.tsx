"use client";

import { useEffect } from "react";

export default function ScrollReveals() {
  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || !("IntersectionObserver" in window)) return;

    const elements = document.querySelectorAll<HTMLElement>(".section-heading, .process-card, .permit-banner, .inspiration-card, .about-inner > div, .faq-grid > div, .contact-inner");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    elements.forEach((element) => {
      element.classList.add("scroll-reveal");
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.classList.add("is-revealed");
        return;
      }
      if (element.matches(".process-card, .inspiration-card") && element.parentElement) {
        const index = Array.from(element.parentElement.children).indexOf(element);
        element.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 65}ms`);
      }
      observer.observe(element);
    });

    function revealAll() {
      if (!motionPreference.matches) return;
      observer.disconnect();
      elements.forEach((element) => element.classList.add("is-revealed"));
    }

    motionPreference.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", revealAll);
      elements.forEach((element) => {
        element.classList.remove("scroll-reveal", "is-revealed");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return null;
}
