# TimeSeal security deployment checklist

The Android app now requires Firebase App Check for custom quota endpoints and
uses short-lived signed URLs for capsule media. Complete these console steps
before distributing the patched build.

## 1. Register Android App Check

1. In Google Play Console, link the Play Integrity API to Firebase project
   `timeseal-bba5a`.
2. In Firebase Console > App Check, register Android app
   `com.timeseal_aurasoft_systems`.
3. Add the SHA-256 fingerprints for the Play App Signing certificate and the
   local debug certificate used for QA.
4. Use Play Integrity for release builds. Debug builds automatically use the
   debug provider; register the debug token printed by the Android app logs.

Do not enable Firestore or Storage enforcement until a release build has
successfully produced valid App Check metrics. The custom TimeSeal HTTPS
endpoints already reject requests without a valid App Check token.

## 2. Configure RevenueCat webhook

Enable Secret Manager API for Firebase project `timeseal-bba5a`:

```powershell
gcloud services enable secretmanager.googleapis.com --project timeseal-bba5a
```

Create the Functions secret:

```powershell
firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
```

Deploy the backend and rules:

```powershell
npm --prefix functions run build
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

In RevenueCat Dashboard > Integrations > Webhooks:

- URL: `https://us-central1-timeseal-bba5a.cloudfunctions.net/revenuecatWebhook`
- Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`
- Enable purchase, renewal, cancellation, billing issue, and expiration events.

## 3. Verify signed URL permission

Open one capsule detail screen in the release build. If Functions logs report a
`signBlob` permission error, grant the Functions runtime service account the
`Service Account Token Creator` role, then retry.

## 4. Enable App Check enforcement

After release App Check metrics are valid, enable enforcement in Firebase
Console for:

- Cloud Firestore
- Cloud Storage
- Realtime Database
- Authentication, when the Firebase Console preview is suitable for rollout

The scheduled Functions migrate legacy media tokens, rotate legacy share
tokens, migrate legacy avatar tokens, and remove abandoned upload drafts every
six hours.

Avatar uploads use a server-created draft. The finalized avatar size is counted
in the account's static storage quota. Android devices cache each avatar version
locally until the owner changes it, so the same device does not repeatedly
download an unchanged avatar. On a cache miss, including after reinstalling the
app, the backend records the avatar size in the requesting user's monthly
bandwidth quota before issuing a five-minute signed URL.

## 5. Monitor the bounded signed-URL window

Full capsule media URLs expire after 30 minutes. The app records quota before
issuing them, caches the first viewed image locally for Home thumbnails, and
never persists capsule media download tokens. An authorized user can still
replay a short-lived signed URL during that 30-minute window. Configure Google
Cloud billing budgets and Storage monitoring before launch.

If exact per-byte billing enforcement is required, replace direct signed URLs
with an authenticated streaming proxy or a CDN layer that meters each transfer.
