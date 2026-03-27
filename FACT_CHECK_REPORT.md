# Fact-Check Report -- UI Themes Research

Prepared by Team Material (Android 17) as cross-team research validator.
Date: 2026-03-26

---

## Team Cupertino (Liquid Glass)

### Confirmed

- **WWDC 2025 announcement date (June 9, 2025)**: Confirmed. Apple announced Liquid Glass at WWDC on June 9, 2025.

- **Shipped in iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, tvOS 26**: Confirmed. These OS versions all adopted the Liquid Glass design language.

- **Craig Federighi quote about industrial design studios and fabricated glass**: Confirmed. Federighi stated that designers used Apple's industrial design studios to fabricate glass of various opacities and lensing properties. Multiple sources (Wikipedia, TechRadar, Yanko Design) corroborate this. The brief's paraphrase is accurate.

- **Apple Silicon computational requirement**: Confirmed. Federighi explicitly stated that Apple Silicon provides the extra computational power required.

- **"Most significant visual overhaul since iOS 7 (2013)"**: Confirmed. Multiple press outlets describe Liquid Glass as the biggest design change since iOS 7's flat design shift.

- **SVG filter techniques (feTurbulence, feDisplacementMap, feSpecularLighting)**: Technically accurate as CSS/SVG implementation techniques. These are real SVG filter primitives and the described usage patterns (feTurbulence for noise, feDisplacementMap for refraction, feSpecularLighting for rim light) are correct. The code in `liquid-glass.css` and the design brief use these primitives properly.

- **Spring animation cubic-bezier(0.34, 1.56, 0.64, 1)**: Confirmed as a valid overshoot bezier curve. Y values exceeding 1.0 do create the described "bounce" effect. This is a standard CSS technique, not an Apple-specific value.

- **hue-rotate is universally supported and GPU-accelerated**: Confirmed. `filter: hue-rotate()` has excellent browser support and is composited on the GPU.

### Partially Accurate

- **Blur values "60-100px"**: The design brief's comparison table (in the Android 17 brief, referencing Apple) claims "60-100px + saturation." The Liquid Glass CSS file actually uses `blur(60px)` as `--lg-blur-ultra` and `blur(48px)` for the heavy login card. No 100px value appears anywhere in the implementation. Web recreations of Liquid Glass use much lower values (2-33px). Apple's native implementation uses platform APIs, not CSS backdrop-filter, so specific px values are approximations by web developers. The 60px upper bound is reasonable; 100px appears inflated with no supporting source. **Recommendation**: Change the claimed range to "20-60px" to match the actual CSS implementation, or explicitly note these are web approximations.

- **feDisplacementMap "only works reliably in Chromium-based browsers"**: Partially accurate but overstated. feDisplacementMap is supported in all major browsers (Chrome, Firefox, Safari) per MDN and caniuse.com. However, there are known cross-browser inconsistencies: Chrome, Firefox, and Safari handle displacement calculations differently for non-square inputs, and transparent input handling varies. Firefox has specific issues with feImage + feDisplacementMap combinations. The claim is directionally correct (Chromium gives the most predictable results) but saying it "only works reliably" in Chromium is too strong. **Recommendation**: Rephrase to "feDisplacementMap is supported in all major browsers but produces inconsistent results across Firefox and Safari for non-square or transparent inputs; Chromium gives the most predictable rendering."

- **"Firefox renders backdrop-filter with known performance limitations"**: Partially accurate. Firefox historically had delayed support for backdrop-filter (it was behind a flag until Firefox 103 in 2022), and earlier versions had performance issues. Current Firefox versions support it, though performance varies by GPU and driver. The claim is outdated as a blanket statement. **Recommendation**: Note that Firefox support has improved significantly since 2022.

- **"Safari handles backdrop-filter best of all"**: Plausible but unverifiable with a specific source. Safari (WebKit) was the first browser to implement `-webkit-backdrop-filter` and has long had good support. However, Safari has its own SVG filter limitations. The claim is reasonable for backdrop-filter specifically but doesn't account for the SVG filter side of Liquid Glass.

### Incorrect

- No outright incorrect claims identified.

### Unverifiable

- **"Physical glass samples fabricated by Apple engineers"**: The brief says "physical glass samples fabricated by Apple engineers." Federighi's actual words (per TechRadar) were that designers used Apple's industrial design studio to "fabricate glass of various opacities and lensing properties." The word "engineers" does not appear in the original quote -- it was the "industrial design studio" and "designers." Minor distinction but the brief should use "designers" not "engineers" if quoting.

- **Exact CSS values matching Apple's native implementation**: Apple's Liquid Glass uses native platform APIs (SwiftUI `.glassEffect()` modifier), not CSS. All CSS blur/saturate values in the brief are web developer approximations. This is implicitly understood but never explicitly stated. **Recommendation**: Add a note that all CSS values are community approximations, not Apple specifications.

---

## Team Shop Floor (SCADA Amber)

### Confirmed

- **ISA-101 is a real HMI design standard**: Confirmed. ANSI/ISA-101.01-2015 "Human Machine Interfaces for Process Automation Systems" is a real, published standard from the International Society of Automation.

- **ANSI/ISA-18.2 is a real alarm management standard**: Confirmed. ANSI/ISA-18.2-2016 "Management of Alarm Systems for the Process Industries" is a real standard.

- **ISA-101 recommends gray/monochromatic backgrounds with color reserved for status**: Confirmed. Multiple sources (Rockwell Automation white papers, RealPars, Adroit Technologies) confirm that ISA-101 high-performance HMI design recommends gray backgrounds with color used sparingly and only for alarms and abnormal states.

- **General ISA color semantics (green = normal, yellow = attention, red = alarm, blue = informational)**: Confirmed. These broad color associations are consistent with ISA-101 implementation guidelines and general industrial HMI practice.

- **Fanuc, Siemens Sinumerik, Heidenhain as industrial precedents**: Confirmed as real CNC controller product lines with the described aesthetic (dark backgrounds, monospace text, data-first layouts).

- **Amber phosphor CRT legibility claim**: Confirmed. Amber phosphor (P3 phosphor) CRT terminals were widely used in industrial settings and are still regarded as highly legible for low-light environments. This is well-documented in display technology literature.

- **Zero border-radius as industrial convention**: Confirmed as an accurate observation about industrial control interfaces.

### Partially Accurate

- **"These colors come directly from ISA-101 HMI Design Standard and ANSI/ISA-18.2 Alarm Management"**: This is the most significant overstatement in the SCADA brief. ISA-101 and ISA-18.2 provide *guidelines and frameworks* for color usage, not specific hex color codes. ISA-101 recommends that color be used sparingly and meaningfully, with a gray-based palette as default. ISA-18.2 deals with alarm lifecycle management, not HMI color palettes. The specific color assignments in the brief (blue = designed, purple = cut, yellow = machined, orange = assembled, green = done) are NOT "directly from" either standard. The brief correctly maps the general ISA conventions (green = normal/complete, yellow = attention, red = alarm, blue = informational) but then extends them with purple for CUT and orange for ASSEMBLED, which are custom mappings, not ISA-specified. **Recommendation**: Rephrase to "inspired by ISA-101 HMI color conventions" rather than "come directly from." Explicitly note which colors are standard ISA associations and which are custom extensions for the FRC workflow.

- **ISA-18.2 as a color standard**: ISA-18.2 is an alarm *management* standard focused on alarm lifecycle, rationalization, and operator response. It addresses how alarms should be managed, prioritized, and documented. While it mentions that alarm states should be visually distinguishable (including color), it is not primarily a color specification. Calling it a "color standard" alongside ISA-101 is misleading. **Recommendation**: Reference ISA-18.2 for alarm priority structure, not for color definitions.

### Incorrect

- No outright fabrications identified, but the "directly from ISA-101/ISA-18.2" claim for the full color palette is misleading enough to warrant correction.

### Unverifiable

- **"GE Mark VIe turbine control: status color system identical to the one implemented here"**: The claim that the GE Mark VIe uses an "identical" color system is unverifiable without access to the actual GE Mark VIe HMI documentation. The general principle (green = normal, yellow = caution, red = alarm) is universal in industrial control, but "identical" is a strong word. **Recommendation**: Change to "similar" or "consistent with."

---

## Team Material (Android 17 -- Self-Review)

### Confirmed

- **"Cinnamon Bun" codename**: Confirmed. Multiple sources (Android Authority, Android Police, GSMArena) confirm that "Cinnamon Bun" is Android 17's internal dessert codename, discovered in Android Canary builds.

- **Beta in February 2026**: Confirmed. Android 17 Beta 1 was released February 13, 2026. Beta 2 followed on February 26, 2026. The brief says "entered public beta in February 2026" which is accurate.

- **Mid-2026 release target**: Confirmed. Multiple sources indicate a stable release around June 2026.

- **Material 3 Expressive unveiled at I/O 2025**: Confirmed. Google presented M3 Expressive at Google I/O 2025 (it was actually leaked slightly before the event on May 5, 2025).

- **46 research studies with 18,000 participants**: Confirmed. Multiple sources (Google Design, Neowin, Android Authority, Dezeen) cite exactly these numbers.

- **System-wide frosted glass (volume panel, power menu, Quick Settings, notifications, dialogs)**: Confirmed. Multiple sources (TechSpot, Android Authority, PhoneArena, 9to5Google) confirm that Android 17 introduces frosted glass blur to the volume panel, power menu, Quick Settings tiles, notifications, and recent apps.

- **Dynamic Color tinting the blur layer**: Confirmed. Sources confirm the blurs are tinted by the Dynamic Color theme.

- **Material Color Utilities tonal palette algorithm**: Confirmed. The `@material/material-color-utilities` package and the tonal palette generation from a seed color are real and well-documented.

- **MD3 tint elevation system (5% -> 8% -> 11% -> 12% -> 14%)**: Confirmed. These are the standard Material Design 3 elevation tint percentages.

- **M3 Expressive corner radii (28dp extra-large, 16dp large)**: Confirmed as part of the MD3 shape system.

- **MD3 motion easing curves**: The easing curves listed (standard: `0.2, 0.0, 0.0, 1.0`, emphasized enter: `0.05, 0.7, 0.1, 1.0`, etc.) are consistent with Material Design 3 motion specifications.

- **State layer hover/focus/pressed opacity values (0.08/0.12/0.12)**: Confirmed as standard MD3 state layer opacities.

### Partially Accurate

- **"Android motion is cubic-bezier easing, not spring physics"**: Partially accurate but increasingly outdated. Historically, Android used cubic-bezier curves for CSS-like transitions, and Material Design's official documentation specifies easing curves in cubic-bezier notation. However, Android's native Jetpack Compose has supported spring-based animations for years, and M3 Expressive documentation discusses "expressive" motion that can include spring physics. The claim is true for CSS implementations specifically but oversimplifies Android's native motion system. **Recommendation**: Clarify that cubic-bezier is the correct approach for CSS/web implementations, while native Android increasingly uses spring physics.

- **Blur values "24-40px" for Android 17 vs "60-100px" for Apple**: The 24-40px range for Android is reasonable based on the implementation values used in the theme CSS (24px for nav rail, 40px for surfaces). The comparison table claims Apple uses "60-100px" which, as noted in the Liquid Glass section, is inflated. **Recommendation**: Adjust Apple comparison values downward or note they are estimates.

### Incorrect

- No outright incorrect claims identified.

### Unverifiable

- **"Android 17 adds a system-wide frosted glass layer on top of M3 Expressive"**: The framing as "on top of" M3 Expressive is a simplification. The blur effects are part of the System UI evolution in Android 17, which is informed by M3 Expressive but not strictly layered on top of it. This is a minor architectural nitpick.

- **Specific blur values (16-40px) as "what Android 17 uses"**: These are reasonable estimates used by developers recreating the effect in CSS. Android's native implementation uses platform rendering APIs, not CSS pixel values. The brief doesn't explicitly claim these are Android's internal values, but the comparison table implies direct equivalence.

---

## Summary and Recommendations

### Team Cupertino (Liquid Glass)
The brief is well-researched and technically sound. The CSS/SVG techniques are accurately described and the implementation is correct. Two items need correction: (1) the browser compatibility section overstates feDisplacementMap's Chromium-only reliability -- it works across browsers with inconsistencies, not failures; (2) the blur range should be stated as approximate web developer values, not Apple specifications, since Apple's native implementation uses SwiftUI APIs, not CSS. The Craig Federighi quote should attribute to "designers" not "engineers."

### Team Shop Floor (SCADA Amber)
The brief makes a strong argument well-grounded in real industrial precedents. The most significant correction needed is the ISA-101/ISA-18.2 color claim: these standards provide color *principles* (green = normal, red = alarm, yellow = caution, blue = informational), not the specific six-color palette used in the brief. The purple and orange mappings are custom extensions, not ISA-specified. ISA-18.2 is an alarm management lifecycle standard, not a color standard. Rephrase "come directly from" to "inspired by." The GE Mark VIe "identical" claim should be softened to "consistent with."

### Team Material (Android 17 -- Self-Review)
The brief's factual claims hold up well. The Cinnamon Bun codename, February 2026 beta, research statistics (46 studies, 18,000 participants), and system-wide frosted glass features are all confirmed. The main correction is the oversimplification that Android motion is "cubic-bezier, not spring physics" -- native Android increasingly uses spring physics, though CSS implementations do use cubic-bezier. The Apple blur comparison values (60-100px) should be adjusted downward to match what web implementations actually use (20-60px).
