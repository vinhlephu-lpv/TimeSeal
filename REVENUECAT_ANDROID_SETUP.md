# RevenueCat Android Setup

## 1) Dien API key vao app

Mo file:

`src/config/revenuecat.ts`

Dien key:

```ts
const REVENUECAT_ANDROID_KEYS = {
  debug: 'goog_xxx_or_test_xxx',
  release: 'goog_xxx',
};
```

Luu y:
- `release` bat buoc la Android Public SDK Key (prefix `goog_`).
- Khong dung secret key `sk_` trong app.

## 2) Lay API key o dau

RevenueCat Dashboard:
- `Project Settings`
- `API keys`
- `App specific keys`
- Copy Android public key (`goog_...`)

## 3) Cau hinh RevenueCat dashboard (bat buoc)

- Tao `Entitlement` id: `premium`
- Tao `Offering` hien tai (Current)
- Gan 3 package rieng vao offering. Khong dung chung `$rc_monthly` cho ca 3 goi:
  - custom package `plus_monthly` -> product `timeseal_plus_monthly`
  - custom package `pro_monthly` -> product `timeseal_pro_monthly`
  - custom package `pro_max_monthly` -> product `timeseal_promax_monthly`
- Ca 3 product phai gan vao entitlement `premium`
- Product ID trong RevenueCat phai trung chinh xac Product ID tren Google Play Console
- Gia Google Play:
  - Plus: `29.000 VND / thang`
  - Pro: `79.000 VND / thang`
  - Pro Max: `199.000 VND / thang`

## 4) Cau hinh Google Play Console

- Tao app voi package name dung voi app Android
- Tao 3 subscription product (active):
  - `timeseal_plus_monthly`
  - `timeseal_pro_monthly`
  - `timeseal_promax_monthly`
- Them tester trong `License testing`
- Upload AAB len `Internal testing` it nhat 1 lan
- Cai ban Internal testing tren may test

## 5) Build lai Android

```bash
npm install
npm run android
```

Neu loi native module sau khi moi cai:

```bash
cd android
gradlew clean
cd ..
npm run android
```

## 6) Quick test flow

- Mo Premium modal trong app
- Bam tung goi Plus / Pro / Pro Max
- Thanh toan sandbox thanh cong
- Doi chieu ten goi va gia tren sheet Google Billing
- Vao Profile thay dung trang thai Plus / Pro / Pro Max
