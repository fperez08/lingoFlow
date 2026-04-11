# Design System Specification: The Cognitive Sanctuary

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Cognitive Sanctuary."** 

Unlike typical "gamified" language apps that use loud colors and frantic animations, this system is built on the philosophy of **Quiet Authority.** It treats language learning as a high-end editorial experience—calm, focused, and deeply intentional. We move away from the "standard dashboard" look by utilizing **intentional asymmetry** and **tonal depth**. By layering surfaces and prioritizing whitespace over structural lines, we create an environment that reduces cognitive load, allowing the user's focus to remain entirely on the linguistic content.

## 2. Colors: Tonal Architecture
This system abandons the rigidity of black-and-white layouts for a sophisticated palette of deep teals and layered neutrals.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background shifts. For example, a video transcript panel (`surface-container-low`) should sit against the main workspace (`surface`) without a stroke. Use space and color to define the edge, not a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
- **Base Layer:** `surface` (#f7f9fb) for the global background.
- **Content Zones:** `surface-container-low` (#f2f4f6) for sidebar backgrounds.
- **Interactive Elements:** `surface-container-lowest` (#ffffff) for cards and active input areas.
- **Prominence:** `surface-container-high` (#e6e8ea) for subtle hovering or secondary focus states.

### The "Glass & Gradient" Rule
To elevate the "Premium" feel, use **Glassmorphism** for floating navigation or video overlays. Apply `surface-container-lowest` at 80% opacity with a `24px` backdrop-blur. 
**Signature Gradients:** For primary CTAs (e.g., "Start Lesson"), transition from `primary` (#006071) to `primary_container` (#007b8f) at a 135-degree angle. This adds a "soul" to the interface that flat colors cannot mimic.

## 3. Typography: Editorial Clarity
We use a dual-font strategy to balance character with extreme legibility.

*   **Display & Headlines (Manrope):** Chosen for its geometric modernism. Use `display-lg` for welcome screens and `headline-sm` for lesson titles. The wide apertures of Manrope feel "encouraging" and open.
*   **Body & Interface (Inter):** The workhorse. Inter is optimized for the screen. Use `body-lg` for transcripts and vocabulary definitions. Its high x-height ensures that even complex foreign characters remain legible.
*   **Labels:** Use `label-md` for metadata (e.g., "Level: B2" or "Video Length") in uppercase with 0.05em letter spacing to provide an authoritative, curated feel.

## 4. Elevation & Depth: Tonal Layering
Depth is achieved through "stacking" tiers rather than artificial shadows.

*   **The Layering Principle:** To lift a card, do not reach for a shadow first. Place a `surface-container-lowest` (pure white) card on a `surface-container-low` (pale gray) background. The contrast is enough to signal elevation.
*   **Ambient Shadows:** When a floating modal or popover is required, use a "Cloud Shadow": `y-offset: 12px, blur: 40px, spread: 0px`. The color must be a 6% opacity tint of `on_surface` (#191c1e).
*   **The "Ghost Border" Fallback:** For accessibility in high-glare environments, use a "Ghost Border": `outline-variant` (#bec8cc) at 15% opacity. It should be felt, not seen.
*   **Tactile Feedback:** On hover, a card should not just change color; it should transition from `surface-container-lowest` to a subtle `surface_bright` with a slight `y-offset` lift of -2px.

## 5. Components: Curated Primitive styling

### Cards & Lists
*   **Rule:** Forbid the use of divider lines. 
*   **Execution:** Use the spacing scale (e.g., `1.5rem` vertical gaps) or alternating background shades (`surface` vs `surface-container-low`) to separate items in the video library.
*   **Roundedness:** All cards use `lg` (1rem / 16px) corner radius to feel approachable.

### Buttons
*   **Primary:** Gradient (Primary to Primary Container), `xl` roundedness (1.5rem), `title-sm` typography.
*   **Secondary:** Ghost style. No background, `primary` text, and a `15% opacity primary` background on hover.
*   **Tertiary:** `surface-variant` background with `on_surface_variant` text.

### Input Fields
*   **Styling:** Forgo the "box" look. Use a `surface-container-highest` background with a bottom-only 2px accent of `outline-variant`. On focus, the bottom accent transitions to `primary`.

### Specialized Learning Components
*   **The "Focus Video Player":** The player should be nested in a `surface-container-highest` wrapper with ultra-rounded corners (`xl`). 
*   **Vocabulary Chips:** Use `secondary_container` with `on_secondary_container` text. When marked as "Mastered," transition to a soft green utilizing a custom success token (derived from `primary` hues but shifted to green).
*   **Transcript Highlighting:** Use a `tertiary_fixed` (#ffdcc3) background with `on_tertiary_fixed` text for active words. This "amber" glow provides a warm, non-jarring focus point.

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Let the sidebar be significantly narrower than the content, but give it a "heavier" surface color (`surface-container-low`) to anchor the page.
*   **Use Generous Padding:** A lesson screen should feel like a gallery, not a spreadsheet. Use `2rem` (32px) as your default inner-container padding.
*   **Focus on Micro-Interactions:** A word should "glow" subtly when hovered in a transcript, using a 5% opacity `primary` tint.

### Don’t:
*   **Don't Use Pure Black:** Even for text, use `on_surface` (#191c1e). Pure black (#000000) is too harsh for an "educational sanctuary."
*   **Don't Use Borders:** If you feel the need to draw a line, try adding `16px` of whitespace instead.
*   **Don't Over-Animate:** Transitions between lessons should be a slow "fade and slide" (300ms, ease-out), mimicking the turning of a page in a premium textbook.