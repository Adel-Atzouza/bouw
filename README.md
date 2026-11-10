# Dèlicent

Dutch website for a bouwkundig tekenbureau providing architectural drawings and permit application assistance. Built with Next.js 16, React 19 and TypeScript.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Production: `pnpm build` followed by `pnpm start`. Tests: `pnpm test`.

## Website

- Dutch service descriptions, interactive schematic drawing examples, process, FAQs and contact form.
- Responsive dark-blue, bordeaux and white design, original architectural SVG illustrations and local mood photographs.
- Keyboard navigation, visible focus states, reduced-motion support and semantic form labels.
- Dutch building guidance links to IPLO and the official Omgevingsloket; the site does not guarantee permits or submit official applications itself.
- `/privacy` describes the enquiry data flow. No advertising or analytics trackers.

## Before public launch

Set the verified `NEXT_PUBLIC_DELICENT_*` business details from `.env.example` in `.env.local` and rebuild. Configure persistent private storage with `DELICENT_ENQUIRY_DIR`.

The contact form saves enquiries privately to `.data/delicent/DEL-…/enquiry.json`. Email notifications are not connected. Review these records as your inbox until a delivery integration is configured. Do not serve or commit this directory.

See [Dèlicent setup, sources and launch details](docs/delicent.md) for privacy review, retention and production requirements. Previous private intake records are untouched; [archived documentation](docs/legacy-site.md) covers the retained legacy utilities.

## Images

The existing locally hosted mood images originate from Unsplash: `photo-1600607687920-4e2a09cf159d` and `photo-1600210492486-724fe5c67fb0`. Images are labelled as mood imagery, not Dèlicent projects. Manrope is fetched at build time and served locally.
