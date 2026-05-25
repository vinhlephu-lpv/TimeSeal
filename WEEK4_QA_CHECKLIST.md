# Week 4 QA Checklist

## 1) Build health (must pass)
- `npm run qa:smoke`
- `npm run qa:functions`

## 2) Firebase deploy prep
- Confirm `google-services.json` in `android/app/`
- Confirm Firestore rules/indexes and Storage rules already published
- Optional deploy via CLI:
  - `npm run firebase:deploy:rules`
  - `npm run firebase:deploy:functions`

## 3) End-to-end manual flow
- Register/Login by email
- Login with Google
- Create capsule 4 steps (Step1 -> Step2 -> Step3 -> Preview)
- Upload 1-3 images and create capsule
- Verify Home sections:
  - `Dang cho` when open date is future
  - `Mo ngay` when open date is reached
  - `Da mo` after opening capsule
- Open locked capsule -> countdown visible
- Share invite link from locked/detail screen
- Open deep link `timeseal://invite?capsuleId=...` -> InviteAccept screen
- Join capsule from InviteAccept
- Notifications screen:
  - list visible
  - mark one read by tap
  - mark all read works

## 4) Push notification flow
- Foreground message creates notification item
- Background/open-app message navigates to capsule
- Killed app + notification tap opens capsule

## 5) Regression guard
- Re-open app after creating capsule (ensure Home still loads)
- Create capsule with no image
- Create capsule with max 5 images
- Test slow network (airplane on/off) and ensure no app crash

## 6) Release sanity (Android)
- `cd android && gradlew clean`
- `npm run android`
- Verify no red screen on startup
- Verify `SafeAreaView` on auth, create flow, home, profile, notifications
