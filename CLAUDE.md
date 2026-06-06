# TimeSeal_AuraSoft_Systems

React Native mobile app for TimeSeal, a digital time-capsule product with Firebase backend, RevenueCat subscriptions, AdMob rewarded slots, and Android release tooling.

<!-- User-editable intro section. taw-kit only updates content between taw:auto:* markers below. -->

## Stack

<!-- taw:auto:stack -->

- Runtime: Node.js >= 22.11.0, TypeScript, React Native 0.85.2, React 19.2.3.
- Mobile: React Navigation native stack and bottom tabs, Zustand stores, React Native Firebase, Notifee, Reanimated, Lottie, vector icons.
- Backend: Firebase Auth, Firestore, Cloud Storage, Realtime Database, Cloud Functions v2 in `functions/src`.
- Billing: RevenueCat via `react-native-purchases`; plan policy is centralized in `src/config/plans.ts`.
- Ads: `react-native-google-mobile-ads`; rewarded capsule-slot flow uses signed AdMob SSV handled by `functions/src/api.ts`.
- Native: Android app id `com.timeseal_aurasoft_systems`; release builds are ABI-limited to `armeabi-v7a,arm64-v8a`.
<!-- $taw:auto:stack -->

## Commands

<!-- taw:auto:scripts -->

- `npm start` - start Metro.
- `npm run android` - run Android debug build.
- `npm run ios` - run iOS build.
- `npx tsc --noEmit` - root TypeScript check for app code.
- `npm run lint` - ESLint, currently may be noisy from existing repo debt.
- `npm test` - Jest, currently blocked in this repo by AsyncStorage native mock setup.
- `npm --prefix functions run build` - compile Firebase Functions.
- `npm run android:bundle:release` - build Android release AAB with selected ABIs.
- `npm run firebase:deploy:functions` - deploy Cloud Functions only.
<!-- $taw:auto:scripts -->

## Architecture

<!-- taw:auto:architecture -->

- `src/screens` - user-facing app flows: auth, home, capsule creation/detail/opening, notifications, profile, storage.
- `src/services` - Firebase, RevenueCat, AdMob, media, notification, cache, invite, and backend integration helpers.
- `src/store` - Zustand stores for auth, capsules, notifications, and alerts.
- `src/config` - product constants for plans, RevenueCat, Firebase, Google Sign-In, AdMob, and rewarded slot limits.
- `src/navigation` - app/auth stacks, bottom tabs, and global navigation ref.
- `src/components` - reusable UI, capsule visuals, update gate, premium/expired/downgrade modals.
- `src/theme` - colors, spacing, typography, theme context, capsule theme definitions.
- `functions/src/api.ts` - large Cloud Functions API surface, including media upload drafts, invitations, billing/webhook-related endpoints, maintenance, and AdMob SSV.
- `android/app` - native Android package, versioning, signing config, release build settings, and native version module.

Hot areas from recent git history: `src/screens`, `android/app`, `src/services`, `src/components`, `src/store`, `functions/src`, `src/navigation`, `src/theme`, `src/types`, `src/config`.

<!-- $taw:auto:architecture -->

## Conventions

<!-- taw:auto:conventions -->

- Keep plan and quota rules centralized; prefer helpers from `src/config/plans.ts` and `src/config/rewardCapsuleSlots.ts`.
- Keep billing fixes tightly scoped to subscription services, billing/profile/storage surfaces, and RevenueCat webhook behavior.
- Do not rewrite broad UTF-8-heavy files casually; use narrow patches for files such as `functions/src/api.ts`.
- For backend changes, validate with `npm --prefix functions run build`; for app code, validate with `npx tsc --noEmit`.
- The app has an i18n layer in `src/i18n/index.ts`; user-visible strings should go through `t(...)` when editing translated surfaces.
- `functions/lib/`, `node_modules/`, Android/Gradle caches, `.bundle/`, `.taw/`, and `.env*` are generated or local-only and should stay out of Git.
<!-- $taw:auto:conventions -->

### Additional Conventions

- Treat this app as internal-alpha unless release QA, production billing validation, notification edge cases, and paid rollout checks have been completed.
- Preserve existing product rules unless the user explicitly changes the quota, billing, downgrade, or expiry policy.
- When fixing one flow, avoid speculative copy/UI cleanup outside the failing path.

## Gotchas

- `npm run lint` can report pre-existing debt; use targeted checks when the task is narrow.
- Jest is not currently a strong gate because AsyncStorage native module mocking is incomplete.
- Scheduler deploys that remove or replace functions may need `firebase deploy --only functions --force` plus `firebase functions:list`.
- Release AAB slimming uses `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a`.
- AdMob rewarded-slot development should use Google test rewarded ads; production release should use the real TimeSeal rewarded ad unit.

## Known Issues

<!-- taw:auto:fix-gotchas -->

- 2026-06-06: AdMob rewarded slots - debug builds used the live rewarded unit, so internal QA could hit no-fill and show "Ad is not ready". Prevent by using the Google rewarded test unit in debug and allowing signed SSV from that unit.
<!-- $taw:auto:fix-gotchas -->

## Related Docs

<!-- taw:auto:docs -->

- [README.md](./README.md) - app overview, stack, and quick start.
- [GIT_BACKUP_RESTORE.md](./GIT_BACKUP_RESTORE.md) - restore and backup guidance for the private repo.
- [REVENUECAT_ANDROID_SETUP.md](./REVENUECAT_ANDROID_SETUP.md) - Android RevenueCat setup notes.
- [SUBSCRIPTION_QA_CHECKLIST.md](./SUBSCRIPTION_QA_CHECKLIST.md) - subscription QA checklist.
- [SECURITY_DEPLOYMENT.md](./SECURITY_DEPLOYMENT.md) - security deploy notes.
- [APP_UPDATE_FIREBASE.md](./APP_UPDATE_FIREBASE.md) - Firebase app update gate notes.
- [WEEK4_QA_CHECKLIST.md](./WEEK4_QA_CHECKLIST.md) - release QA checklist.
- [WEEK4_SHIP_SUMMARY.md](./WEEK4_SHIP_SUMMARY.md) - week 4 shipping summary.
<!-- $taw:auto:docs -->

## Features Added Via taw-kit

<!-- taw:auto:features -->

_Append-only log for future taw feature work._

<!-- $taw:auto:features -->

---

<!-- taw:auto:footer -->

_taw-maintained. Last update: 2026-06-06. Sections between `<!-- taw:auto:* -->` markers are generated; edit freely outside markers._

<!-- $taw:auto:footer -->
