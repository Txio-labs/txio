'use client';

/*
 * Motion for Txio, built on GSAP.
 *
 * Mark elements in markup and the hooks animate them:
 *   data-reveal          fades and rises into view once, when scrolled to
 *   data-reveal-group    its direct children do the same, staggered
 *   data-hero="n"        hero pieces, played in order on load (n = order)
 *   data-parallax="px"   drifts by up to px while it crosses the viewport
 *   data-countup         a number that counts up from 0 when first shown
 *
 * Everything sits inside gsap.matchMedia('(prefers-reduced-motion: no-preference)'),
 * so people who ask for less motion get the static page.
 */

import { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export const EASE = 'power3.out';

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)';

/** Scroll reveals, hero intro, parallax and count-ups inside `scope`. */
export function useMarketingMotion(
    scope: RefObject<HTMLElement | null>,
    { scroller, key }: { scroller?: RefObject<HTMLElement | null>; key?: unknown } = {}
) {
    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            mm.add(NO_PREFERENCE, () => {
                const root = scope.current;
                if (!root) return;
                const scrollerEl = scroller?.current ?? undefined;

                // Hero: ordered intro on load.
                const heroItems = gsap.utils
                    .toArray<HTMLElement>('[data-hero]', root)
                    .sort((a, b) => Number(a.dataset.hero) - Number(b.dataset.hero));
                if (heroItems.length) {
                    const tl = gsap.timeline({ defaults: { ease: EASE } });
                    heroItems.forEach((el, i) => {
                        const words = el.querySelectorAll<HTMLElement>('[data-word]');
                        const at = i === 0 ? 0 : '-=0.45';
                        if (words.length) {
                            tl.from(words, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.07 }, at);
                        } else if (el.dataset.heroKind === 'stage') {
                            tl.from(el, { y: 70, opacity: 0, scale: 0.96, duration: 1.2, ease: 'expo.out' }, '-=0.5');
                        } else {
                            tl.from(el, { y: 18, opacity: 0, duration: 0.7 }, at);
                        }
                    });
                }

                gsap.utils.toArray<HTMLElement>('[data-reveal]', root).forEach((el) => {
                    gsap.from(el, {
                        y: 28,
                        opacity: 0,
                        duration: 0.9,
                        ease: EASE,
                        scrollTrigger: { trigger: el, start: 'top 88%', once: true, scroller: scrollerEl },
                    });
                });

                gsap.utils.toArray<HTMLElement>('[data-reveal-group]', root).forEach((group) => {
                    gsap.from(group.children, {
                        y: 24,
                        opacity: 0,
                        duration: 0.8,
                        ease: EASE,
                        stagger: 0.07,
                        scrollTrigger: { trigger: group, start: 'top 85%', once: true, scroller: scrollerEl },
                    });
                });

                gsap.utils.toArray<HTMLElement>('[data-parallax]', root).forEach((el) => {
                    const dist = Number(el.dataset.parallax) || 40;
                    gsap.fromTo(
                        el,
                        { y: dist },
                        {
                            y: -dist,
                            ease: 'none',
                            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, scroller: scrollerEl },
                        }
                    );
                });

                gsap.utils.toArray<HTMLElement>('[data-countup]', root).forEach((el) => {
                    const end = Number(el.dataset.countup);
                    if (!Number.isFinite(end)) return;
                    const obj = { v: 0 };
                    gsap.to(obj, {
                        v: end,
                        duration: 1.4,
                        ease: 'power2.out',
                        scrollTrigger: { trigger: el, start: 'top 90%', once: true, scroller: scrollerEl },
                        onUpdate: () => {
                            el.textContent = Math.round(obj.v).toLocaleString();
                        },
                    });
                });
            });
        },
        { scope, dependencies: [key], revertOnUpdate: true }
    );
}

/** A short entrance each time `key` changes: used for app pages and tabs. */
export function useEnter(scope: RefObject<HTMLElement | null>, key: unknown) {
    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            mm.add(NO_PREFERENCE, () => {
                if (!scope.current) return;
                gsap.from(scope.current, { opacity: 0, y: 8, duration: 0.35, ease: EASE, clearProps: 'all' });
                const items = scope.current.querySelectorAll<HTMLElement>('[data-enter]');
                if (items.length) {
                    gsap.from(items, { opacity: 0, y: 12, duration: 0.5, ease: EASE, stagger: 0.05, delay: 0.05, clearProps: 'all' });
                }
            });
        },
        { scope, dependencies: [key], revertOnUpdate: true }
    );
}

/** Split a string into word spans that the hero timeline can animate. */
export function splitWords(text: string): Array<{ word: string; key: string }> {
    return text.split(' ').map((word, i) => ({ word, key: `${i}-${word}` }));
}
