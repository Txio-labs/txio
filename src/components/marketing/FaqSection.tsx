import { SectionHeading } from '@/components/marketing/MarketingShell';
import { FAQ, faqJsonLd, jsonLdScript } from '@/lib/seo';

export function FaqSection() {
    return (
        <section className="w-full px-5 md:px-10 2xl:px-16 mt-24 md:mt-32">
            <SectionHeading eyebrow="FAQ" title="Common questions, answered." />
            <dl className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
                {FAQ.map((item) => (
                    <div key={item.question}>
                        <dt className="text-[17px] font-semibold text-fg">{item.question}</dt>
                        <dd className="mt-2 text-[15px] leading-relaxed text-fg-muted">{item.answer}</dd>
                    </div>
                ))}
            </dl>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
        </section>
    );
}
