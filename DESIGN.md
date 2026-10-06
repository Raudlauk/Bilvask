# Steam interface design

The approved font-preview design is the visual authority for the public booking flow. It is promoted to `/` without changing booking calculations, availability, submission, or language support.

## Shared visual system

- Self-hosted Supreme typeface; Arial fallback.
- Teal canvas `#103c47`, ink `#163d46`, pale surfaces `#f6f8f5`, separators `#cddbd8`, lime actions `#d4e775`.
- Existing Ytre Namdal Vekst logo and Steam wordmark; orange brand detail retained.
- Panels use 12–16px corners; inputs and buttons use 8px corners.
- The booking flow has three mounted steps. Selection and form state survive navigation. Desktop transitions reveal the header; mobile transitions reveal the active panel.
- Keyboard focus remains visible and option focus outlines stay within their rows. Motion respects reduced-motion preferences.
- All public pages share `components/site-header.tsx` (logo, language, Vaskestatus, Ansattinnlogging). The current page is underlined; Vaskestatus is hidden when status tracking is disabled.
- On phones (≤720px) the step 1 and 2 navigation is a sticky bottom bar with the running price and duration. Step 3 keeps its inline total above the submit button.
- Visible text uses the plain hyphen for ranges and separators (`08:00-15:00`, `Vaskestatus - Steam`). It never uses the em dash or the en dash (per `docs/skill.md` §9.G).
- In the calendar, fully booked days are distinct from unavailable ones: a warm hatched tile labelled "Fullt" with no strike-through. Strike-through is reserved for closed, past and out-of-range dates.

## Redesign scope

The presets come from `docs/skill.md`, section 1.B. Confirmation and Vaskestatus use **Redesign - overhaul**: replace the composition within the approved visual system, while preserving routes, content, forms, and functionality. Admin uses **Redesign - preserve**: retain the tabs, permissions, operational controls, and information density while improving typography, spacing, and hierarchy.

Existing public screens used centered blue/white cards, Arial typography, and orange/olive accents. Admin used compact cards, tabs, tables, and settings forms. The public visual variance and motion rise by two relative to those screens, with density preserved; admin retains its variance and density with one increment of restrained interaction feedback. These are task interfaces, so motion supports feedback and never delays actions.

Shared typography and header styling live in `app/site-design.css`; booking styling lives in `components/booking-design.module.css`. Route modules own confirmation, status, and admin composition. No new UI dependencies are required.
