export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://txio.xyz').replace(/\/+$/, '');

export const SITE_DESCRIPTION =
  'Build, simulate, sign and run RPC calls and transactions on Sui, Ethereum and EVM chains, Solana, Aptos and Stellar from one interface.';

/** Questions answered on the home page. The same list feeds the FAQPage JSON-LD, so markup and visible copy match. */
export const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'What is Txio?',
    answer:
      'Txio is a unified client for building, simulating, signing and running blockchain RPC calls and transactions. It ships as a web app, a desktop app and a CLI, with one account across all three.',
  },
  {
    question: 'Which blockchains does Txio support?',
    answer:
      'Sui, Ethereum and other EVM chains, Solana, Aptos, and Stellar with Soroban smart contracts. Each chain uses its own native methods, transaction formats and address shapes.',
  },
  {
    question: 'How is Txio different from Postman or a generic API client?',
    answer:
      'Txio understands chain-specific RPC methods and transaction formats. It builds Move programmable transaction blocks for Sui and connects wallet signing directly. A generic HTTP client only sends the request.',
  },
  {
    question: 'Does Txio sign transactions with my wallet?',
    answer:
      'Yes. You sign with the wallet for that chain, including Ledger hardware wallets. Before anything is signed, a dry run on the chain shows the fee, balance changes where the chain reports them, touched objects and events. Mainnet shows an explicit warning before real funds move.',
  },
  {
    question: 'Is Txio production-ready?',
    answer:
      'Txio is pre-1.0 and has not had a security audit. Treat it as a developer tool, and review every simulation before you sign.',
  },
  {
    question: 'Where can I get the desktop app and the CLI?',
    answer:
      'The desktop app is a native app for Linux, macOS and Windows that updates itself; it is available from the Txio download page. The CLI, txio, runs the same calls from your shell and CI pipelines and is open source on GitHub at github.com/Txio-labs/txio-cli.',
  },
];

/** Escapes `<` so the JSON cannot close the surrounding script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Txio',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        sameAs: ['https://github.com/Txio-labs'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Txio',
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: 'Txio',
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web, Linux, macOS, Windows',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
