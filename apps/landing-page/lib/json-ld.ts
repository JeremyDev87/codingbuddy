interface JsonLdInput {
  name: string;
  description: string;
  locale: string;
}

interface JsonLdOutput {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  inLanguage: string;
  offers: {
    '@type': string;
    price: string;
    priceCurrency: string;
  };
}

export const generateJsonLd = ({ name, description, locale }: JsonLdInput): JsonLdOutput => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name,
  description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Cross-platform',
  inLanguage: locale,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
});
