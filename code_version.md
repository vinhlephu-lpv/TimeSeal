# TimeSeal Code Version Notes

## 2026-06-02 - Subscription entitlement reconciliation fix

### Muc tieu

Sua luong RevenueCat + Google Play Billing bi goi nham goi, trao nham Pro Max,
mat quyen sau logout/login, cham trao quyen sau thanh toan, va xu ly sai
huy/gia han.

### Root cause da xac dinh

1. `src/services/premiumService.ts` cu fallback sang `$rc_monthly`, `monthly`
   hoac package dau tien. Neu offering co nhieu goi, app co the mo Google Billing
   cho sai SKU.
2. `src/services/subscriptionService.ts` cu tron
   `allPurchasedProductIdentifiers` vao danh sach active. Lich su tung mua Pro
   Max co the de len Plus dang active.
3. `premiumService.ts` va `subscriptionService.ts` giu hai bien cache RevenueCat
   UID rieng. `authStore.ts` goi `Purchases.logOut()` nhung hai cache khong reset,
   nen login lai co the bo qua `Purchases.logIn(uid)`.
4. Webhook cu coi `BILLING_ISSUE` la het quyen ngay va khong luu tach biet
   `CANCELLATION`, `RENEWAL`, `EXPIRATION`.
5. Firestore rules cu cho client tu update `users/{uid}.plan` va `isPremium`.

### Product ID chuan

Nguon cau hinh client: `src/config/subscriptionProducts.ts`.

| Goi | Google Play / RevenueCat product ID | Gia |
| --- | --- | --- |
| Plus | `timeseal_plus_monthly` | 29.000 VND / thang |
| Pro | `timeseal_pro_monthly` | 79.000 VND / thang |
| Pro Max | `timeseal_promax_monthly` | 199.000 VND / thang |

Android co the tra ID kem base plan suffix, vi du
`timeseal_plus_monthly:monthly`. Ham mapping chap nhan dung product ID hoac
product ID kem suffix, khong dung `includes('pro')` mo ho.

### Luong client moi

1. `src/services/revenueCatIdentityService.ts` la noi duy nhat configure va
   identify RevenueCat.
2. RevenueCat `appUserID` luon la Firebase Auth UID.
3. Khi logout, app thao listener va xoa UID trong memory. App khong goi
   `Purchases.logOut()` de tranh tao RevenueCat anonymous customer.
4. Khi login UID moi hoac login lai, app goi `Purchases.logIn(uid)` neu SDK da
   configure truoc do.
5. `premiumService.ts` chi mua package co `pkg.product.identifier` map dung goi
   nguoi dung chon. Khong con fallback package dau tien.
6. Sau khi `purchasePackage()` tra thanh cong, modal dua chinh `CustomerInfo`
   vua xac nhan vao `syncSubscription(customerInfo)`. Quyen duoc cap ngay, khong
   can restart hoac login lai.
7. Khi nang goi Android, app gui `googleProductChangeInfo` voi
   `IMMEDIATE_WITH_TIME_PRORATION`. Google Play la ben quyet dinh credit/refund.
8. `subscriptionService.ts` chi dung active subscription. Lich su mua cu khong
   duoc dung de chon goi hien tai.
9. Neu webhook Firestore co event moi hon cache RevenueCat tren may, state backend
   verified thang de app nhan huy/gia han/het han ma khong can restart.

### Listener lifecycle

`watchSubscriptionForUser(uid)` dang ky mot bo listener theo UID:

- Firestore `users/{uid}` `onSnapshot`.
- RevenueCat `addCustomerInfoUpdateListener`.
- React Native `AppState` de invalidate cache va refresh khi app foreground.

Khi UID doi hoac logout, ca ba listener duoc cleanup. Khong co `setInterval`,
polling loop hoac setState trong render. Auth store so sanh snapshot moi va cu
truoc khi update state.

### Luong webhook moi

File: `functions/src/api.ts`.

- Kien truc hien tai cua repo luu subscription verified trong Firestore
  `users/{uid}`. RTDB chi dang dung cho `adminPlanOverrides`; ban va khong doi
  schema sang RTDB de tranh mo rong scope.
- Bind secret Cloud Functions v2 bang `secrets: ['REVENUECAT_WEBHOOK_SECRET']`.
- Luu state theo tung product trong `users/{uid}.subscriptionMeta.products`.
- Chon goi active co priority cao nhat: Free < Plus < Pro < Pro Max.
- `CANCELLATION`: tat auto-renew nhung giu quyen den expiration.
- `BILLING_ISSUE`: giu quyen trong thoi gian con active hoac grace period.
- `RENEWAL`: cap nhat expiration va bat lai active.
- `EXPIRATION`: chi thu hoi product da het han. Neu con product active cao hon,
  product cao hon van thang.
- Webhook uu tien `app_user_id` khong anonymous va fallback sang alias khong
  anonymous de ghi dung `users/{uid}`.

### Bao mat Firestore

`firestore.rules` chan client update cac field server-controlled:

- `isPremium`
- `plan`
- `previousPlan`
- `premiumSource`
- `premiumUpdatedAtISO`
- `subscriptionMeta`

Cloud Function Admin SDK van ghi duoc cac field nay.

### UI thay doi toi thieu

- Modal mua goi da co loading `Dang xu ly...`.
- Sau mua/restore thanh cong hien alert ro rang.
- Nang goi Plus -> Pro, Plus -> Pro Max, Pro -> Pro Max hien thong bao Google
  Play quyet dinh credit/refund.
- Man Quan ly dung luong an nut `Nang cap goi` neu tai khoan da la Pro Max.
- App hien feedback khi huy gia han, billing issue, renewal, uncancellation va
  expiration.

### File da thay doi

- `src/config/subscriptionProducts.ts`
- `src/services/revenueCatIdentityService.ts`
- `src/services/premiumService.ts`
- `src/services/subscriptionService.ts`
- `src/store/authStore.ts`
- `src/components/modals/PremiumModal.tsx`
- `src/screens/profile/StorageManagementScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/i18n/index.ts`
- `functions/src/api.ts`
- `firestore.rules`
- `REVENUECAT_ANDROID_SETUP.md`
- `SUBSCRIPTION_QA_CHECKLIST.md`

### Cau hinh console can lam thu cong

1. Google Play Console: tao/kiem tra dung 3 product ID va gia trong bang tren.
2. RevenueCat: entitlement `premium`; Current Offering co 3 custom package rieng:
   `plus_monthly`, `pro_monthly`, `pro_max_monthly`.
3. RevenueCat webhook: URL
   `https://us-central1-timeseal-bba5a.cloudfunctions.net/revenuecatWebhook`,
   header `Bearer <REVENUECAT_WEBHOOK_SECRET>`.
4. Bat webhook events: initial purchase, renewal, cancellation, uncancellation,
   billing issue, product change va expiration.
5. Deploy:

```powershell
npm --prefix functions run build
firebase deploy --only functions,firestore:rules
```

6. Chay `SUBSCRIPTION_QA_CHECKLIST.md` tren ban Internal testing.

### Ket qua verify local ngay 2026-06-02

- `npx tsc --noEmit`: pass.
- `npm --prefix functions run build`: pass.
- `git diff --check`: pass.
- `npm run android:bundle:release`: pass, tao
  `android/app/build/outputs/bundle/release/app-release.aab`.
- `npx jest --runInBand`: chua chay duoc test vi setup Jest hien tai chua mock
  `@react-native-async-storage/async-storage` (`NativeModule: AsyncStorage is
  null`). Day la blocker test infrastructure ton tai san, khong phai loi
  TypeScript hoac Android release build cua ban va.

### Snapshot khoi phuc truoc deploy

Snapshot duoc tao truoc khi deploy Firebase de neu co loi phat sinh ngoai pham
vi subscription thi co the quay lai nhanh.

- Base truoc khi sua billing: branch `main`, commit `d970ca2`.
- Nhanh chua snapshot: `codex/subscription-billing-recovery-20260602`.
- Pham vi snapshot chi gom cac file liet ke trong muc `File da thay doi`.
- Chua deploy Firebase tai thoi diem tao snapshot.
- Chua upload AAB moi len Google Play Internal testing tai thoi diem tao
  snapshot.

#### Cach quay lai code truoc ban sua billing

Khong dung lenh nay neu dang co thay doi chua commit can giu lai. Commit hoac
backup thay doi moi truoc khi rollback.

```powershell
git switch main
```

Neu da deploy Firebase va can phuc hoi backend, deploy lai `functions` va
`firestore.rules` tu branch `main`:

```powershell
git switch main
npm --prefix functions run build
firebase deploy --only functions,firestore:rules
```

#### Cach quay lai ban sua billing sau khi rollback

```powershell
git switch codex/subscription-billing-recovery-20260602
```

#### Ghi chu ve du lieu

Rollback code khong tu dong xoa `subscriptionMeta` da ghi vao Firestore.
Metadata nay duoc server quan ly va co the giu lai de dieu tra lifecycle
subscription. Neu can migration hoac xoa du lieu, phai backup Firestore truoc va
thuc hien nhu mot buoc rieng, khong xoa tay trong luc deploy.

### Trang thai deploy live ngay 2026-06-02

Da deploy len Firebase project `timeseal-bba5a` sau khi tao snapshot Git.

#### Snapshot Git

- Snapshot code truoc deploy: commit `af99d20`.
- Branch snapshot: `codex/subscription-billing-recovery-20260602`.
- Base de rollback ve code cu: branch `main`, commit `d970ca2`.
- Branch snapshot da push len GitHub:
  `origin/codex/subscription-billing-recovery-20260602`.

#### Firestore Rules

- Lenh da chay:

```powershell
firebase deploy --only firestore:rules
```

- Ket qua: compile thanh cong va rules moi da release len Cloud Firestore.

#### RevenueCat webhook secret

- Da tao Secret Manager secret `REVENUECAT_WEBHOOK_SECRET`.
- Secret dang dung la version `2`.
- Version `1` tao loi trong luc khoi tao da bi destroy, khong duoc dung.
- Function `revenuecatWebhook` da bind version `2`.
- Gia tri secret khong ghi vao Git, file `.md` hoac log. Ban sao can dung de cau
  hinh RevenueCat Dashboard da duoc dua vao clipboard cua may deploy.

#### Cloud Functions

- Lenh da chay:

```powershell
firebase deploy --only functions
```

- Ket qua: deploy thanh cong.
- `revenuecatWebhook` dang `ACTIVE` tai:
  `https://us-central1-timeseal-bba5a.cloudfunctions.net/revenuecatWebhook`.
- Hau kiem: gui `POST` khong co Authorization vao webhook tra HTTP `401`.
- Firebase deploy lai tat ca function export trong cung codebase `default`,
  gom `api`, `revenuecatWebhook`, `cleanupStaleAvatarDrafts`,
  `cleanupStaleUploadDrafts`, `revokeLegacyMediaTokens` va `unlockCapsules`.

#### Viec con lai tren dashboard va thiet bi test

1. Mo RevenueCat Dashboard, cau hinh webhook URL:
   `https://us-central1-timeseal-bba5a.cloudfunctions.net/revenuecatWebhook`.
2. Them Authorization header dang `Bearer <secret>`. Gia tri `<secret>` dang o
   clipboard cua may deploy. Khong paste secret vao repo hoac file `.md`.
3. Kiem tra Current Offering co 3 custom package dung nhu muc
   `Cau hinh console can lam thu cong`.
4. Upload AAB moi tai
   `android/app/build/outputs/bundle/release/app-release.aab` len Google Play
   Internal testing.
5. Chay het `SUBSCRIPTION_QA_CHECKLIST.md` bang tai khoan license tester.

#### Gioi han tu dong hoa tai workspace

- Repo chua co Fastlane, Google Play Publisher service account hoac script upload
  Internal testing.
- Workspace chua co RevenueCat API key de sua webhook va offering bang API.
- Tai thoi diem hau kiem khong co thiet bi Android ket noi qua ADB.
- Vi vay cac buoc dashboard, upload AAB va test thanh toan sandbox can thuc hien
  thu cong.

## 2026-06-02 - Billing UX follow-up

### Pham vi da chot

Ban follow-up nay chi sua luong mua goi, doi goi va trao quyen tren client.
Khong siat them Firestore Rules, khong doi schema Firestore, khong sua luong
upload capsule va khong deploy Firebase lai. Muc tieu la giam rui ro phat sinh
ngoai pham vi thanh toan.

### Snapshot truoc khi sua

- Commit truoc follow-up: `6ca7117`.
- Branch: `codex/subscription-billing-recovery-20260602`.
- Neu can quay lai rieng ban follow-up nay, co the restore cac file client tu
  commit `6ca7117` sau khi backup thay doi moi.

### Loi bo sung da xac dinh

1. `subscriptionService.ts` cu so sanh `CustomerInfo.originalAppUserId` voi
   Firebase UID. RevenueCat cho phep `originalAppUserId` la alias cu hoac
   anonymous ID hop le, nen check nay co the tra tai khoan ve Free sai sau khi
   logout/login hoac restore.
2. `revenueCatIdentityService.ts` cu chi so sanh UID cache trong JavaScript.
   Cache nay khong phai nguon su that cua SDK RevenueCat.
3. `premiumService.ts` cu dung
   `IMMEDIATE_WITH_TIME_PRORATION` cho ca nang goi va ha goi. Ha goi co the lam
   mat quyen loi som hon ky thanh toan hien tai.
4. Modal mua goi cu cho bam mua lai dung goi dang dung va khong noi ro ha goi
   duoc len lich cho ky sau.

### Thay doi da lam

- `src/services/revenueCatIdentityService.ts`
  - Doc `Purchases.getAppUserID()` tu SDK truoc khi quyet dinh `logIn(uid)`.
  - Neu SDK dang o UID khac, goi `Purchases.logIn(uid)` truc tiep. Khong goi
    `logOut()` de tranh tao anonymous customer ngoai y muon.
- `src/services/subscriptionService.ts`
  - Bo check sai tren `originalAppUserId`.
  - Van chi trao quyen dua tren entitlement va subscription dang active.
- `src/services/premiumService.ts`
  - Dang ky moi: mua goi va trao quyen ngay khi RevenueCat tra `CustomerInfo`.
  - Nang goi: dung `IMMEDIATE_WITH_TIME_PRORATION`.
  - Ha goi: dung `DEFERRED`, giu goi hien tai den het ky thanh toan roi moi
    chuyen sang goi thap hon.
  - Mua lai dung goi hien tai: chan truoc khi goi Google Billing.
- `src/components/modals/PremiumModal.tsx`
  - Mo modal tai goi hop ly tiep theo: Free -> Plus, Plus -> Pro, Pro -> Pro Max.
  - Nut mua dung goi hien tai bi vo hieu hoa.
  - Ha goi hien xac nhan rieng, noi ro goi hien tai van co hieu luc den het ky.

### UX mong doi sau ban follow-up

| Truong hop | Ket qua |
| --- | --- |
| Free mua Plus, Pro hoac Pro Max | Google Billing mo dung SKU, RevenueCat tra quyen ngay |
| Plus nang Pro / Pro Max | Doi ngay, Google Play tinh phan chenh lech |
| Pro nang Pro Max | Doi ngay, Google Play tinh phan chenh lech |
| Pro Max ha Pro / Plus | Len lich chuyen vao ky gia han tiep theo |
| Pro ha Plus | Len lich chuyen vao ky gia han tiep theo |
| Bam dung goi dang dung | Khong mo Google Billing |
| Logout roi login lai | SDK doi ve dung Firebase UID bang `getAppUserID()` va `logIn(uid)` |

### File thay doi trong follow-up

- `src/services/revenueCatIdentityService.ts`
- `src/services/subscriptionService.ts`
- `src/services/premiumService.ts`
- `src/components/modals/PremiumModal.tsx`
- `code_version.md`

### Ket qua verify follow-up

- `npx tsc --noEmit`: pass.
- `npm --prefix functions run build`: pass.
- `git diff --check`: pass.
- ESLint theo 4 file client vua sua: khong co error, con 5 warning style da co
  san hoac khong anh huong billing.
- `npm run android:bundle:release`: pass, tao lai
  `android/app/build/outputs/bundle/release/app-release.aab`.
- `npx jest --runInBand`: chua chay duoc test vi setup Jest van chua mock
  `@react-native-async-storage/async-storage` (`NativeModule: AsyncStorage is
  null`). Ban follow-up khong sua test infrastructure de giu dung pham vi.

### Viec can test tay tren Internal testing

1. Free mua Plus, logout, login lai: van giu Plus.
2. Free mua Plus, sau do nang Pro: trao Pro ngay.
3. Pro nang Pro Max: trao Pro Max ngay.
4. Pro Max chon Plus: modal noi ro ha goi vao ky sau; sau thanh toan quyen Pro
   Max hien tai van con.
5. Mo lai modal tai goi dang dung: nut goi hien tai bi vo hieu hoa, khong mo
   Google Billing lan nua.
