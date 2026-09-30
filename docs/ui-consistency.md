# UI consistency

Rules for any change that touches what the user sees. They exist because small
mismatches kept shipping: an Apple sign-in button whose label was visibly
larger than the Google button beside it, form buttons at 15pt next to sign-in
buttons at 16pt, and 19 different font sizes across the app. None were caught
because each element was checked on its own, never against its neighbours.

## 1. Siblings share one component

Elements shown together as peers — the buttons in a group, the cards in a list,
the rows of a settings section — come from **one component with variants**,
never from separately styled copies.

- Sign-in buttons: `components/auth/SignInButton.tsx`, one per provider.
- Floating action: `components/ui/FloatingActionButton.tsx`.
- Settings rows: `components/settings/Fields.tsx`.

If you are about to write a second button that sits next to an existing one,
extend the existing component instead. Variants may change the surface (colour,
border); they may not change height, radius, padding, icon size or label type.

## 2. Type comes from the scale

`constants/Typography.ts` defines every text role (`display`, `title`,
`heading`, `subheading`, `body`, `bodySmall`, `label`, `button`, `buttonSmall`).

- New code spreads a role and adds only colour:
  `{ ...Type.body, color: Colors.onSurfaceVariant }`.
- No raw `fontSize` / `fontFamily` in new styles. If no role fits, add one to
  the scale deliberately — don't invent a size inline.
- Existing styles with raw sizes are drift. Move a screen onto the scale when
  you next change it; don't leave it half-converted.
- Primary full-width buttons also share metrics: `ButtonSize` (height 58,
  radius 14, icon 20, gap 12).

## 3. Colours come from `constants/Colors.ts`

No raw hex in screens (see CLAUDE.md → UI conventions). Blue is the accent;
primary buttons are pearl (`Colors.action` / `actionDim` / `onAction`).

## 4. Native controls that own their styling don't sit next to ours

Platform components that render their own text — `AppleAuthenticationButton`,
native pickers, share sheets' buttons — ignore our fonts and size themselves.
Next to our components they will mismatch. Either use them alone, or replace
them with our component where the platform allows it (Apple permits a custom
Sign in with Apple button that uses its logo and wording).

## 5. Verify against the neighbours before shipping

A typecheck proves nothing about looks. Before calling a UI change done:

1. **Put it next to its siblings.** Screenshot the screen with the new element
   and the elements beside it, and compare height, text size, weight, icon
   size, radius and spacing side by side.
2. **Check the smallest and a large phone.** 375pt wide (iPhone SE/mini) and
   430pt (Pro Max). Text must not wrap differently between siblings.
3. **Check with larger system text.** iOS Settings → Display → Text Size one
   step up; nothing should clip or overlap.
4. **Say what was not checked.** If the change could not be seen on a device
   (native-only UI, no simulator run), say so in the commit or the handoff —
   don't imply it was verified.

## 6. Shipping over the air

JS-only changes go out with `eas update`, and reach every installed build on
the same runtime version. Code that imports a native module added in a later
build must load it lazily and degrade (see `lib/appleSignIn.ts`), or the update
crashes older builds.
