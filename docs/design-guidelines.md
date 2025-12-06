# Meat Up // Design Guidelines & Manifesto

> **The Vibe:** Bold, confident, and appetizing. A premium butcher shop meeting a modern food blog. It is loud, high-contrast, and unapologetic about its subject matter. **No salads allowed.**

---

## 1. Core Principles

1.  **Typography is Image:** Text is not just for reading; it is the primary visual element. Headlines must be massive, condensed, and command attention.
2.  **Calculated Edges:** We favor clean lines and defined shapes, but not to the point of harshness. Subtle rounded corners and softer shadows are permitted to make the UI feel more polished and approachable than standard brutalism.
3.  **The Palette Constraint:** Stick rigidly to the defined four-color palette. Do not deviate.
4.  **Raw Imagery:** Photography must be high-texture, high-contrast, and preferably Black & White to clash against the loud UI colors. Focus on the grain of the meat, smoke, and metal tools.

---

## 2. Visual Identity

### The Logo
The primary logo is the **"MU" T-Bone**.
* **Concept:** A stylized white outline of a thick T-Bone steak slab.
* **Detail:** The internal marbling and bone shapes are formed by negative space that explicitly spells out **"MEAT UP"**.
* **Usage:** Typically placed top-left on solid color backgrounds (usually Electric Red).

### Color Palette

| Swatch | Role | Name | Hex Code | Notes |
| :--- | :--- | :--- | :--- | :--- |
| ██████ | Primary Brand | Electric Red | `#E04F5F` | Used for large background fills and accents. |
| ██████ | Action / CTA | Mustard Yellow | `#FFDB58` | Exclusively for high-priority buttons and highlights. |
| ██████ | Text / Borders | Carbon Black | `#000000` | Used for all typography, borders, and shadows. |
| ██████ | Background / Text | Stark White | `#FFFFFF` | Used for secondary backgrounds or text against dark images. |

### Typography & Font Stack

**1. The Loud Voice (Headlines & Display)**
* **Font Family:** **Oswald** (Google Fonts) or **Bebas Neue**.
* **Why:** These condensed sans-serifs mimic the verticality of vintage grocery signage and industrial warnings while maintaining a crisp, modern digital edge.
* **Implementation:**
    * **Case:** Strictly **UPPERCASE**.
    * **Weight:** Bold (700) or Medium (500). Never Light.
    * **Letter Spacing:** Tight (`-0.02em` to `-0.05em`). Letters should feel packed together like sardines.
    * **Usage:** Hero text, section headers (`h1`, `h2`, `h3`), and massive stat numbers.

**2. The Kitchen Voice (UI & Body)**
* **Font Family:** **Inter** or **Montserrat**.
* **Why:** We need extreme legibility to contrast the aggression of the headlines. These geometric sans-serifs provide a premium "tech platform" feel.
* **Implementation:**
    * **Case:** Sentence case for long descriptions. Uppercase for UI labels (nav, tags, small buttons).
    * **Weight:** Regular (400) for text, Semi-Bold (600) for emphasis.
    * **Usage:** Paragraph text, event details, button text, and navigation links.

**3. The Type Hierarchy**
* **Hero:** 96px+ / Oswald Bold / All-Caps / Line-height 0.9
* **Section Title:** 48px / Oswald Medium / All-Caps
* **Card Title:** 24px / Oswald Bold / All-Caps
* **Body Copy:** 16px / Inter Regular / Sentence Case / Line-height 1.5
* **UI Labels:** 12px / Inter Bold / All-Caps / Wide Tracking (`+0.05em`)

### Imagery Style
* **Content:** Close-ups of raw cuts, smoked bark, glistening fat, cleavers, butcher blocks, and smoke.
* **Treatment:** High-contrast Black & White. Gritty textures must be emphasized. Images often sit opposite solid blocks of Electric Red.

---

## 3. UI Components & Layout Rules

### The CTA Button
Buttons should be confident and clear calls to action.
* **Fill:** Mustard Yellow (`#FFDB58`).
* **Border:** A clean (2-3px) solid Carbon Black border.
* **Typography:** Bold, black, all-caps text that is easy to read.
* **Shadows:** A subtle, soft drop shadow is preferred to lift the element. (Hard, flat shadows are reserved for major Hero CTAs).

### Borders & Dividers
* Elements, cards, and sections should be separated by clean, distinct separators. The goal is clarity and structure, not industrial weight.

### Layout Structures
* **The Split Screen:** Use vertical 50/50 splits for hero sections or major feature highlights. One side solid color + typography, the other side raw B&W imagery.
* **The Butcher's Block Grid:** Event lists and card layouts should be organized and clean, creating a rhythmic and scannable grid.

---

## 4. Feature Concepts & Implementation Guide

### The Event List ("Upcoming Feasts")
* **Concept:** The Daily Specials Board. Enticing and easy to browse.
* **Execution:**
    * Entries are clean, well-defined cards (The "Slab" concept).
    * The **DATE** is a prominent visual element on the card, treated like a stamp.
    * A clear yellow CTA button on every card ("DETAILS").

### Single Event Page ("The Main Course")
* **Concept:** The star of the show. Focus on the delicious details.
* **Execution:**
    * Utilize the Split-Screen layout.
    * **Left:** Giant B&W photo of the main meat.
    * **Right:** Solid Electric Red background with logistical details in a clear, checklist-style format.
    * The **"RSV-PORK"** button sticks to the bottom of the viewport on mobile.

### Ratings ("The Flavor Scale")
* **Concept:** A straightforward measure of deliciousness.
* **Execution:**
    * Replace 5-star scales with visceral text ranges: **"RARE AF"** (5/5) down to **"BURNT HOCKEY PUCK"** (1/5).
    * Visualized using clean, horizontal progress bars with black outlines.

### User Profile ("Your Butcher's Apron")
* **Concept:** A collection of your culinary achievements.
* **Execution:**
    * **Badges:** Bold, shield-shaped icons with brand colors and black outlines.
    * **Header:** Background texture should feature a subtle clean butcher block (wood grain) or brushed stainless steel.