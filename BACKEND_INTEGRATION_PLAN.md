# TimeSeal Backend Integration Plan

Muc tieu: lam xong checklist nay thi app TimeSeal co backend dung duoc cho MVP production: dang nhap, tao capsule, upload media, invite, unlock theo lich, thong bao, premium, rules an toan, deploy Firebase.

Stack chot theo project hien tai:
- Mobile app: React Native CLI
- Auth: Firebase Authentication
- Database: Cloud Firestore
- File: Firebase Storage
- Backend jobs/API: Cloud Functions for Firebase v2
- Push: Firebase Cloud Messaging
- Premium: RevenueCat + webhook ve Cloud Functions

---

## 0. Dieu kien dau vao

### 0.1. Cai tool tren may

Chay:

```powershell
node -v
npm -v
firebase --version
java -version
```

Can dat:
- Node >= 22.11.0
- Firebase CLI
- Java/JDK dung voi Android build
- Android Studio + emulator hoac may that

Neu chua co Firebase CLI:

```powershell
npm install -g firebase-tools
firebase login
```

### 0.2. Cai dependency

Tai root project:

```powershell
npm install
npm --prefix functions install
```

### 0.3. Kiem tra Firebase project

Firebase project hien tai trong repo:

```text
timeseal-bba5a
```

Can kiem tra file:

```text
.firebaserc
firebase.json
android/app/google-services.json
src/config/firebase.ts
```

Neu thieu `android/app/google-services.json`:
1. Vao Firebase Console.
2. Chon project `timeseal-bba5a`.
3. Project settings > Your apps > Android app.
4. Tai `google-services.json`.
5. Dat vao `android/app/google-services.json`.

---

## 1. Chot schema backend

### 1.1. Tao tai lieu schema

Tao file:

```text
BACKEND_SCHEMA.md
```

Noi dung can co:
- Collections
- Fields
- Ai duoc doc/ghi
- Field nao chi server duoc cap nhat
- Index can deploy

### 1.2. Schema `users/{uid}`

Dung shape nay:

```ts
type UserDoc = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  isPremium: boolean;
  premiumSource: 'none' | 'revenuecat';
  premiumUpdatedAtISO: string | null;
  capsuleCount: number;
  createdAtISO: string;
  updatedAtISO: string;
  lastLoginAtISO: string | null;
  settings: {
    notificationEnabled: boolean;
    language: 'vi' | 'en';
  };
};
```

Quyen:
- Client duoc doc user da dang nhap.
- Client duoc update `displayName`, `photoURL`, `settings`.
- Client khong duoc tu update `isPremium`, `premiumSource`, `capsuleCount`.
- Server duoc update tat ca.

### 1.3. Schema `users/{uid}/fcmTokens/{token}`

Dung subcollection thay vi luu 1 token duy nhat:

```ts
type FcmTokenDoc = {
  token: string;
  platform: 'android' | 'ios';
  createdAtISO: string;
  updatedAtISO: string;
  lastSeenAtISO: string;
};
```

Quyen:
- User chi doc/ghi token cua chinh minh.
- Server duoc doc tat ca de gui push.

### 1.4. Schema `capsules/{capsuleId}`

```ts
type CapsuleDoc = {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  openDateISO: string;
  createdAtISO: string;
  updatedAtISO: string;
  status: 'locked' | 'unlocked' | 'opened';
  type: 'personal' | 'group';
  theme: 'default' | 'birthday' | 'new_year' | 'graduation';
  members: string[];
  memberEmails: string[];
  openedBy: string[];
  mediaCount: number;
  mediaUrls: string[];
  mediaTypes: Array<'image' | 'video'>;
  coverImageUrl: string | null;
  shareToken: string;
};
```

Quyen:
- Owner doc duoc.
- Member doc duoc.
- Client chi owner duoc tao capsule.
- Client khong duoc tu set `status: unlocked`.
- Client khong duoc tu them `members`.
- Client khong duoc sua `mediaUrls` sau khi tao neu khong qua flow upload hop le.
- Server xu ly unlock, invite accept, notification.

### 1.5. Schema `invites/{inviteToken}`

```ts
type InviteDoc = {
  token: string;
  capsuleId: string;
  invitedBy: string;
  invitedEmail: string | null;
  acceptedBy: string | null;
  status: 'pending' | 'accepted' | 'expired';
  createdAtISO: string;
  expiresAtISO: string;
};
```

Quyen:
- Client khong nen tu update invite thanh accepted.
- Accept invite phai qua Cloud Function.
- Owner doc invite minh tao.
- User co token hop le co the doc metadata toi thieu qua Function.

### 1.6. Schema `notifications/{notificationId}`

```ts
type NotificationDoc = {
  userId: string;
  capsuleId: string;
  type: 'capsule_unlocked' | 'invited' | 'reminder';
  title: string;
  body: string;
  isRead: boolean;
  createdAtISO: string;
};
```

Quyen:
- User doc notification cua minh.
- Client chi duoc update `isRead`.
- Server tao notification.

### 1.7. Schema `subscriptionEvents/{eventId}`

Dung cho RevenueCat webhook:

```ts
type SubscriptionEventDoc = {
  eventId: string;
  appUserId: string;
  type: string;
  entitlementId: string | null;
  productId: string | null;
  purchasedAtISO: string | null;
  expirationAtISO: string | null;
  raw: unknown;
  createdAtISO: string;
};
```

Quyen:
- Chi server ghi/doc.
- Client khong doc.

---

## 2. Firebase Auth

### 2.1. Bat provider trong Firebase Console

Vao:

```text
Firebase Console > Authentication > Sign-in method
```

Bat:
- Email/Password
- Google

### 2.2. Kiem tra Google Sign-In

Trong `src/config/firebase.ts`, field `webClientId` phai la Web client ID cua Firebase/Google.

Kiem tra:

```text
Firebase Console > Project settings > General > Web client ID
```

### 2.3. Tao Cloud Function `onUserCreated`

Trong `functions/src/index.ts`, them function Auth trigger:

Viẹc function lam:
1. Khi user moi duoc tao.
2. Tao `users/{uid}` neu chua ton tai.
3. Set default profile:
   - `isPremium: false`
   - `capsuleCount: 0`
   - `settings.notificationEnabled: true`
   - `settings.language: 'vi'`

### 2.4. Sua app auth flow

File:

```text
src/store/authStore.ts
```

Can giu:
- `login`
- `loginWithGoogle`
- `register`
- `refreshProfile`

Can sua:
- Khi login/register thanh cong, goi `refreshProfile`.
- Khi tao user doc tu client, chi tao field public, khong ghi `isPremium` neu rules da chan.
- Neu dung `onUserCreated`, client chi can doc user doc.

### 2.5. Test auth

Chay app:

```powershell
npm run android
```

Test:
- Register email moi.
- Logout.
- Login email/password.
- Login Google.
- Vao Firestore kiem tra `users/{uid}` duoc tao dung schema.

---

## 3. FCM token va notification permission

### 3.1. Sua token model trong app

File:

```text
src/services/notificationService.ts
```

Hien tai app ghi:

```text
users/{uid}.fcmToken
```

Doi sang:

```text
users/{uid}/fcmTokens/{token}
```

Moi lan app mo:
1. Xin quyen notification.
2. `messaging().registerDeviceForRemoteMessages()`.
3. Lay token bang `messaging().getToken()`.
4. Ghi doc token vao subcollection.
5. Lang nghe `messaging().onTokenRefresh()` de cap nhat token moi.

### 3.2. Xu ly foreground notification

Voi foreground message:
- Khong tao duplicate notification neu server da tao doc roi.
- Chi show/local update UI neu can.

De tranh duplicate:
- Server tao `notifications`.
- Client `onMessage` chi co the refresh/listen, khong add notification moi.

### 3.3. Test FCM

Trong Firebase Console:

```text
Cloud Messaging > Send test message
```

Can test:
- App foreground.
- App background.
- App killed.
- Tap notification mo dung capsule.

---

## 4. Capsule create flow

### 4.1. Giu upload client-side cho MVP

File:

```text
src/store/capsuleStore.ts
```

Flow hien tai:
1. Check quota free/premium.
2. Upload file len Storage.
3. Lay download URL.
4. Tao doc Firestore.

MVP co the giu cach nay, nhung phai siết rules.

### 4.2. Them server validation bang callable Function

Tao callable function:

```text
createCapsule
```

Input:

```ts
{
  title: string;
  message: string;
  openDateISO: string;
  theme: string;
  memberEmails: string[];
  mediaUrls: string[];
  mediaTypes: string[];
}
```

Function lam:
1. Check auth.
2. Lay `users/{uid}`.
3. Check premium:
   - Free toi da 3 capsules.
   - Free khong group.
   - Free khong video.
   - Premium mo gioi han theo plan.
4. Tao `capsules/{capsuleId}`.
5. Tao invite docs neu co `memberEmails`.
6. Tao notification type `invited` neu tim duoc user theo email.
7. Tang `users/{uid}.capsuleCount`.
8. Return `{ capsuleId }`.

### 4.3. Sua app create flow

Sau upload Storage xong:
1. Khong `capsuleRef.set()` truc tiep nua.
2. Goi callable `createCapsule`.
3. Truyen `mediaUrls`, `mediaTypes`.
4. Neu thanh cong navigate preview/detail.

Can them dependency neu chua co:

```powershell
npm install @react-native-firebase/functions
```

### 4.4. Test create capsule

Test case:
- Free tao capsule 1, 2, 3 thanh cong.
- Free tao capsule thu 4 bi chan.
- Free upload video bi chan.
- Free them member email bi chan.
- Premium tao group thanh cong.
- Open date qua khu -> status `unlocked`.
- Open date tuong lai -> status `locked`.

---

## 5. Invite flow

### 5.1. Doi deep link tu `capsuleId` sang `token`

Hien tai:

```text
timeseal://invite?capsuleId=...
```

Doi sang:

```text
timeseal://invite?token=...
```

Ly do:
- Khong expose capsule id truc tiep.
- Token co expiry.
- Token validate duoc.

### 5.2. Tao callable Function `getInvitePreview`

Input:

```ts
{ token: string }
```

Function lam:
1. Check auth optional hoac required.
2. Lay `invites/{token}`.
3. Check `status == pending`.
4. Check `expiresAtISO > now`.
5. Lay capsule.
6. Return:
   - title
   - openDateISO
   - invitedBy displayName

### 5.3. Tao callable Function `acceptInvite`

Input:

```ts
{ token: string }
```

Function lam:
1. Check auth required.
2. Lay invite.
3. Check pending.
4. Check not expired.
5. Lay capsule.
6. Add `request.auth.uid` vao `capsules/{id}.members`.
7. Set invite:
   - `status: accepted`
   - `acceptedBy: uid`
8. Tao notification cho owner: user da tham gia.
9. Return `{ capsuleId }`.

### 5.4. Sua app screens

Files:

```text
src/screens/capsule/InviteCodeScreen.tsx
src/screens/capsule/InviteAcceptScreen.tsx
src/navigation/AppNavigator.tsx
```

Viec can lam:
- Parse `token`, khong parse `capsuleId`.
- `InviteAcceptScreen` goi `getInvitePreview(token)`.
- Nut "Tham gia" goi `acceptInvite(token)`.
- Sau success navigate `CapsuleLocked` voi `capsuleId` server return.

### 5.5. Test invite

Test:
- Link token dung -> hien preview.
- Token sai -> bao loi.
- Token expired -> bao loi.
- Token accepted roi -> bao loi hoac navigate capsule neu cung user.
- User join thanh cong -> doc duoc capsule group.

---

## 6. Unlock capsule theo lich

### 6.1. Toi uu function hien tai

File:

```text
functions/src/index.ts
```

Hien tai function get tat ca capsule `locked` roi filter bang code. Doi sang query:

```ts
db.collection('capsules')
  .where('status', '==', 'locked')
  .where('openDateISO', '<=', nowIso)
  .limit(400)
  .get()
```

Can deploy index:

```text
status ASC + openDateISO ASC
```

### 6.2. Split batch an toan

Firestore batch gioi han 500 writes. Moi capsule co the tao nhieu notification.

Function nen:
1. Query toi da 100-200 capsules/lần.
2. Update status.
3. Tao notifications.
4. Commit theo chunk <= 450 writes.
5. Gui FCM sau khi commit notification docs.

### 6.3. Gui push den tat ca device

Function lam:
1. Lay `users/{uid}/fcmTokens`.
2. Send multicast.
3. Neu token invalid, xoa token doc.

### 6.4. Tao notification docs

Moi user target co 1 doc:

```ts
{
  userId,
  capsuleId,
  type: 'capsule_unlocked',
  title: 'Capsule đã mở!',
  body: `"${title}" đã đến ngày mở.`,
  isRead: false,
  createdAtISO
}
```

### 6.5. Test unlock

Test nhanh:
1. Tao capsule co `openDateISO` qua khu.
2. Chay emulator/function manually hoac deploy rồi trigger schedule test.
3. Kiem tra:
   - Capsule status thanh `unlocked`.
   - Notification doc duoc tao.
   - FCM den may.
   - Tap notification mo dung screen.

---

## 7. Mark opened

### 7.1. Tao callable Function `markCapsuleOpened`

Input:

```ts
{ capsuleId: string }
```

Function lam:
1. Check auth.
2. Lay capsule.
3. Check user la owner/member.
4. Check `status == unlocked` hoac `opened`.
5. Add uid vao `openedBy`.
6. Neu owner mo thi co the set `status: opened`.
7. Return ok.

### 7.2. Sua app

File:

```text
src/store/capsuleStore.ts
```

Hien tai `markCapsuleOpened` set `status: opened` truc tiep. Doi sang callable `markCapsuleOpened`.

### 7.3. Test

Test:
- Owner mo capsule unlocked thanh cong.
- Member mo capsule group thanh cong.
- User khong thuoc capsule bi chan.
- Capsule locked chua den ngay bi chan.

---

## 8. Premium va RevenueCat

### 8.1. Cau hinh RevenueCat

Theo file:

```text
REVENUECAT_ANDROID_SETUP.md
```

Lam:
1. RevenueCat dashboard tao entitlement `premium`.
2. Tao offering current.
3. Tao monthly package.
4. Product ID khop Google Play Console.
5. Dien Android public SDK key vao `src/config/revenuecat.ts`.

### 8.2. Khong cho client ghi `isPremium`

Rules phai chan:

```text
users/{uid}.isPremium
```

Client chi doc `isPremium`.

### 8.3. Tao RevenueCat webhook Function

Tao HTTPS function:

```text
revenueCatWebhook
```

RevenueCat gui event ve. Function lam:
1. Verify shared secret.
2. Lay `app_user_id` = Firebase uid.
3. Luu raw event vao `subscriptionEvents`.
4. Neu entitlement `premium` active -> set `users/{uid}.isPremium = true`.
5. Neu expired/cancelled -> set `isPremium = false`.

### 8.4. Sua app premium flow

File:

```text
src/services/premiumService.ts
```

Sau purchase:
1. Goi RevenueCat purchase.
2. Khong ghi `isPremium` truc tiep neu rules da chan.
3. Goi `Purchases.syncPurchases()` neu can.
4. Hien message: "Đang đồng bộ Premium..."
5. Goi `refreshProfile()` sau vai giay hoac listen user doc.

### 8.5. Test premium

Test:
- Purchase sandbox thanh cong.
- RevenueCat webhook nhan event.
- `users/{uid}.isPremium` thanh true.
- App refresh profile thay premium.
- Restore purchases hoat dong.
- Cancel/expire sandbox -> premium false.

---

## 9. Firestore Rules

### 9.1. Sua `firestore.rules`

Muc tieu:
- User doc an toan.
- Capsule chi owner/member doc.
- Client khong sua field server-only.
- Notification chi user doc, chi update `isRead`.
- Invite accept qua Function.

Server-only fields nen gom:

```text
isPremium
premiumSource
premiumUpdatedAtISO
capsuleCount
status
members
openedBy
shareToken
```

### 9.2. Deploy rules

```powershell
npm run firebase:deploy:rules
```

### 9.3. Test rules thu cong

Dung app:
- User A tao capsule.
- User B khong thay capsule A.
- User B chi thay sau khi accept invite.
- User A khong tu sua `isPremium` tu client.

Sau do nen viet emulator test.

---

## 10. Storage Rules

### 10.1. Sua `storage.rules`

Muc tieu:
- `avatars/{uid}`: chi uid ghi avatar cua minh.
- `capsules/{capsuleId}`:
  - read: owner/member cua capsule.
  - write: owner cua capsule.
  - size limit:
    - Free: 50MB/file hoac gioi han MVP hien tai.
    - Premium: neu can 500MB thi nen enforce bang Function/custom metadata, vi Storage Rules khong doc premium phuc tap de lam dung moi case.

### 10.2. Can luu y

Neu app upload file truoc khi capsule doc ton tai, Storage Rules khong biet owner capsule la ai.

Co 2 cach:

**Cach A - de lam cho MVP**
1. App tao draft capsule qua Function truoc.
2. Function return `capsuleId`.
3. App upload vao `capsules/{capsuleId}`.
4. App goi `finalizeCapsuleUpload`.

**Cach B - giu flow hien tai**
1. Rules cho user dang nhap upload vao temp path:
   `tempUploads/{uid}/{uploadId}/...`
2. Function move/copy metadata sang capsule.

Khuyen nghi: dung Cach A.

### 10.3. Refactor upload flow theo Cach A

Them Functions:
- `createCapsuleDraft`
- `finalizeCapsuleUpload`

Flow:
1. App goi `createCapsuleDraft(metadata without mediaUrls)`.
2. Server validate quota, tao capsule status `draft`.
3. App upload Storage vao `capsules/{capsuleId}`.
4. App lay URLs.
5. App goi `finalizeCapsuleUpload(capsuleId, mediaUrls, mediaTypes)`.
6. Server set status `locked/unlocked`.

Day la flow production tot hon flow hien tai.

---

## 11. Firestore indexes

### 11.1. Kiem tra `firestore.indexes.json`

Can co:

```text
capsules: ownerId ASC, createdAtISO DESC
capsules: status ASC, openDateISO ASC
capsules: members ARRAY_CONTAINS, status ASC
notifications: userId ASC, createdAtISO DESC
notifications: userId ASC, isRead ASC
invites: invitedBy ASC, createdAtISO DESC
invites: invitedEmail ASC, status ASC
```

### 11.2. Deploy indexes

```powershell
firebase deploy --only firestore:indexes
```

---

## 12. App data subscriptions

### 12.1. Home capsules

File:

```text
src/store/capsuleStore.ts
```

Hien tai chi query:

```text
where ownerId == userId
```

Can them query capsule member:

```text
where members array-contains userId
```

Sau do merge 2 lists, remove duplicate, sort by `createdAtISO`.

### 12.2. Notifications

File:

```text
src/store/notificationStore.ts
```

Query nen order:

```text
where userId == uid
orderBy createdAtISO desc
```

Can index tuong ung.

### 12.3. Profile

Profile screen can doc realtime `users/{uid}` de premium update tu webhook hien len nhanh.

---

## 13. Emulator setup

### 13.1. Sua `firebase.json`

Them emulator config:

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### 13.2. Chay emulator

```powershell
firebase emulators:start
```

### 13.3. Ket noi app voi emulator trong debug

Trong app debug, them config neu `__DEV__`:
- Auth emulator
- Firestore emulator
- Storage emulator
- Functions emulator

Can can than voi Android emulator host:

```text
10.0.2.2
```

---

## 14. Tests backend

### 14.1. Functions build

```powershell
npm run qa:functions
```

### 14.2. App smoke

```powershell
npm run qa:smoke
```

### 14.3. Rules tests can viet

Them test cho:
- User tao user doc cua minh.
- User khong tao user doc cua nguoi khac.
- User khong update `isPremium`.
- Owner tao capsule.
- Non-member khong doc capsule.
- Member doc capsule.
- Client khong update `status` thanh unlocked.
- User chi mark read notification cua minh.

### 14.4. Manual E2E

Theo checklist:

```text
WEEK4_QA_CHECKLIST.md
```

Can pass:
- Register/Login.
- Google login.
- Create capsule.
- Upload media.
- Home list.
- Locked countdown.
- Invite.
- Accept invite.
- Unlock.
- Push notification.
- Premium purchase sandbox.

---

## 15. Deploy Firebase

### 15.1. Build functions

```powershell
npm --prefix functions run build
```

### 15.2. Deploy rules/indexes/storage/functions

```powershell
npm run firebase:deploy
```

Hoac tach tung buoc:

```powershell
npm run firebase:deploy:rules
npm run firebase:deploy:functions
firebase deploy --only firestore:indexes
```

### 15.3. Kiem tra sau deploy

Firebase Console:
- Functions deploy thanh cong.
- Firestore rules published.
- Storage rules published.
- Indexes enabled.

---

## 16. Android release sanity

### 16.1. Clean build

```powershell
cd android
.\gradlew clean
cd ..
npm run android
```

### 16.2. Build release

```powershell
npm run android:bundle:release
```

### 16.3. Test ban release/internal

Can test tren Android device:
- App mo khong crash.
- Auth ok.
- Create/upload ok.
- Notification permission ok.
- FCM token duoc ghi.
- Premium sandbox/internal testing ok.

---

## 17. Thu tu implement de lam xong la dung duoc

### Phase 1 - Backend contract va rules nen tang

1. Tao `BACKEND_SCHEMA.md`.
2. Sua `firestore.rules` de chan field nhay cam.
3. Sua `storage.rules` theo flow draft capsule.
4. Cap nhat `firestore.indexes.json`.
5. Deploy rules/indexes.

Ket qua: database khong bi client ghi lung tung.

### Phase 2 - Cloud Functions API

1. Them `onUserCreated`.
2. Them `createCapsuleDraft`.
3. Them `finalizeCapsuleUpload`.
4. Them `getInvitePreview`.
5. Them `acceptInvite`.
6. Them `markCapsuleOpened`.
7. Toi uu `unlockCapsules`.
8. Them helper gui FCM.
9. Build functions.
10. Deploy functions.

Ket qua: nghiep vu nhay cam nam tren server.

### Phase 3 - Sua mobile app goi backend moi

1. Cai `@react-native-firebase/functions` neu chua co.
2. Sua `capsuleStore.createCapsule` sang draft/upload/finalize.
3. Sua `markCapsuleOpened` sang callable.
4. Sua invite screens sang token/function.
5. Sua notification token sang subcollection.
6. Sua subscription capsules de gom owner + member.
7. Sua premium flow khong ghi `isPremium` truc tiep.

Ket qua: app dung backend API moi.

### Phase 4 - RevenueCat production sync

1. Tao webhook secret.
2. Them `revenueCatWebhook`.
3. Cau hinh webhook trong RevenueCat dashboard.
4. Test sandbox purchase.
5. Confirm Firestore `isPremium` sync server-side.

Ket qua: premium khong the bi gia mao tu client.

### Phase 5 - Test va deploy

1. Chay `npm run qa:smoke`.
2. Chay `npm run qa:functions`.
3. Chay manual E2E tren Android.
4. Deploy Firebase.
5. Build Android release/internal.
6. Test lai tren ban release.

Ket qua: app dung duoc end-to-end.

---

## 18. Definition of Done

Backend duoc xem la xong khi tat ca dieu kien nay pass:

- User register/login email duoc.
- User login Google duoc.
- User doc profile tu Firestore duoc.
- User tao capsule personal duoc.
- User upload anh len Storage duoc.
- Free user bi gioi han 3 capsules.
- Free user khong tao group/video duoc.
- Premium user tao group/video duoc.
- Invite link token hoat dong.
- Member accept invite va thay capsule group.
- Capsule den ngay tu dong unlock.
- Notification doc duoc tao khi unlock.
- Push notification den device.
- Tap notification mo dung capsule.
- User khong doc duoc capsule cua nguoi khac.
- User khong tu set premium duoc.
- User khong tu unlock capsule duoc.
- RevenueCat webhook sync premium duoc.
- `npm run qa:smoke` pass.
- `npm run qa:functions` pass.
- `npm run firebase:deploy` pass.
- Android release build thanh cong.

