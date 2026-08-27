/**
 * Shared layout measurements for the floating chrome.
 *
 * Both the tab bar and the home screen's quick-action bar are absolutely
 * positioned, so screens need these to know how much bottom space is actually
 * occupied. Keep in sync with the styles in app/(tabs)/_layout.tsx.
 */

/**
 * Height of the tab bar pill itself, excluding the safe-area inset below it.
 * Derived from _layout.tsx styles: icon 22 + gap 3 + label 14 +
 * tab padding 12 + bar padding 20 + borders 2.
 */
export const TAB_BAR_HEIGHT = 73;

/** Size of the circular/rounded floating action button. */
export const FAB_SIZE = 56;

/** Distance from the screen edge to the floating action button. */
export const FAB_EDGE_INSET = 20;

/** Vertical breathing room between stacked floating elements. */
export const FLOATING_GAP = 12;

/** Minimum bottom inset applied when the device has no home indicator. */
export const MIN_BOTTOM_INSET = 12;
