# App Store submission checklist

Run through this before every App Store submission. Each item comes from a
real review of Crezo (1.0.1, Oct 2026) or from the App Review Guidelines.
Guideline numbers refer to https://developer.apple.com/app-store/review/guidelines/

## Permissions (5.1.1)

- [ ] Only purpose strings for access the app actually uses. Check the resolved
      plist: `EAS_BUILD_PROFILE=production npx expo config --type introspect --json`
      and read `ios.infoPlist` keys ending in `UsageDescription`. Libraries add
      generic ones (camera, microphone) by default;
      `plugins/withoutUnusedPermissions.js` strips them.
- [ ] Every purpose string says what Crezo does with the data, in plain words.
- [ ] A screen shown before a system permission prompt uses "Continue" or
      "Next", never "Allow" (rejected 27 Oct 2026). Offer "Open Settings" when
      access was denied.
- [ ] Prefer the out-of-process system picker (no permission) over library access.
- [ ] Notifications asked in context, never on launch, and nothing requires them.

## Accounts (4.8, 5.1.1(v))

- [ ] Sign in with Apple offered next to Google.
- [ ] Account deletion in the app (Profile > Privacy & security).
- [ ] New sign-ups get every feature (early-access Pro grant), so a reviewer
      never meets a locked feature with no way to buy it.

## Money (3.1, 2.1(b))

- [ ] No mention of future paid plans, "Pro" or "early access" in the app or
      the listing while nothing is for sale (prompted a business-model query
      and reads like a beta under 2.2).
- [ ] When paid plans launch: In-App Purchase only, IAP products submitted with
      the build, restore purchases, terms and privacy links on the paywall.

## Metadata (2.3)

- [ ] No other companies' trademarks in keywords (Instagram, YouTube...).
- [ ] Description has no hard line breaks mid-sentence and claims only shipped behaviour.
- [ ] Screenshots are real app screens.
- [ ] App Privacy answers match what the app collects (including uploaded photos).
- [ ] Privacy policy (crezo.studio/privacy) matches the app: sign-in methods,
      every provider, public media kit, retention, deletion. Update its date.
- [ ] Review notes describe every change in the build, specifically (2.3.1(a)).

## Build

- [ ] Native changes (plugins, permissions, new native modules) need a new
      build; JS-only fixes can go over the air to the build under review.
- [ ] Test on an iPhone and an iPad (reviewers often use an iPad; the app runs
      in iPhone compatibility mode).

## Known gap

- Sign in with Apple token revocation on account deletion (Apple asks apps to
  call the Sign in with Apple REST API `/auth/revoke`). Needs a Sign in with
  Apple key and a Supabase Edge Function. Not yet done.
