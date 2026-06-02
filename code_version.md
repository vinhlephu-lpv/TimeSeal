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
