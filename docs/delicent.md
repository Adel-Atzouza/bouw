# Dèlicent website

The homepage replaces the former renovation website. The new Dutch site focuses on bouwkundige tekeningen, dakkapel, dakopbouw, daglicht- en ventilatieberekeningen, and vergunningbegeleiding. Service cards and packages preselect the corresponding enquiry choice; the frontend and API share these choices in `lib/delicent-services.mjs`. The old renovation components are not rendered. Existing private intake data is not altered.

## Running and receiving enquiries

- `pnpm dev` for the local site; `pnpm build` for the production build.
- `/api/enquiry` validates and saves enquiries atomically to `.data/delicent/DEL-…/enquiry.json`, or `DELICENT_ENQUIRY_DIR` when configured. Retrying an identical request does not duplicate it. Records are not publicly served.
- After storage, the site can queue a notification to **info@delicent.nl** using the server's local Postfix/sendmail. Enable it with `DELICENT_EMAIL_ENABLED=true` after following [Ubuntu email setup](delicent-email.md). An email failure does not discard the saved request. `email.json` records `pending` or `queued`; queued means handed to Postfix, not verified inbox delivery. Never place these records in `public` or commit them.
- Production needs persistent private storage with restricted access and backups. An ephemeral/serverless filesystem is not a durable inbox.
- Follow the privacy notice: review and remove enquiries that do not become projects within three months of the last substantive contact, including backup retention. Retention is an operational process, not an automated job in this version.

## Details still needed before public launch

Set the `NEXT_PUBLIC_DELICENT_*` variables in `.env.local` to the verified business email, phone, address, KvK number and VAT ID, then rebuild. Check that the registered legal identity is represented correctly if it differs from Dèlicent. These are deliberately not invented or copied from the previous business. Review the privacy notice against the actual legal entity, hosting provider, processors and retention practice. The page displays a preparation notice until email, address and KvK are supplied.

The website takes non-binding enquiries only. It does not sell a service or accept a binding order online. Quotes should specify scope, changes, timing, consumer prices including VAT and separate costs such as municipal fees and structural calculations. Agree contract terms and any applicable consumer withdrawal information before accepting an assignment.

## Design and content sources (consulted 10 November 2026)

Inspiration, not copied content or customer claims:

- https://www.tnabouw.nl/ — user-supplied reference. Adopted its clear emphasis on drawing services, personal guidance and a direct quote enquiry. Added original descriptions of deliverables for all six Dèlicent services, a more explicit introduction, and enquiry preparation guidance. TNA’s deadlines, experience figures, reviews, regional identity, photos and approval claims are not Dèlicent claims.

- https://resi.co.uk/ — clear progression from home improvement idea to drawings and planning support.
- https://www.bouwtekeningonline.nl/ — service categories and clear drawing deliverables.
- https://www.btsimons.nl/ — focus on careful architectural drafting and the path from design to permit to elaboration.

Dutch guidance:

- https://iplo.nl/thema/bouw/ — distinguishes technical and spatial activities, Bbl and permit-free building. Linked directly from the site.
- https://omgevingswet.overheid.nl/checken — official location-specific Vergunningcheck; the site does not issue permit decisions.
- https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-bedrijfscorrespondentie/ — business identification on websites.
- https://www.acm.nl/nl/verkoop-aan-consumenten/consumenten-informeren/bedrijfsgegevens-vermelden — accessible company/contact details.
- https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/recht-op-informatie — transparent information about personal data processing.
- https://autoriteitpersoonsgegevens.nl/nl/over-privacy/persoonsgegevens/bewaren-van-persoonsgegevens — documented, purpose-based retention periods.

Existing local interior photographs are reused as explicitly labelled mood images. Original SVG drawings are labelled schematic illustrations, not construction documents or completed Dèlicent projects. No invented portfolio, testimonials, credentials, prices or permit success claims are included. No analytics, advertising trackers or third-party embeds are added.
