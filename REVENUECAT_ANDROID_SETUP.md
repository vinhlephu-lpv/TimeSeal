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

## 3) Cau hinh RevenueCat dashboard (toi thieu)

- Tao `Entitlement` id: `premium`
- Tao `Offering` hien tai (Current)
- Gan package thang (monthly) vao offering
- Product ID trong RevenueCat phai trung product ID tren Google Play Console

## 4) Cau hinh Google Play Console

- Tao app voi package name dung voi app Android
- Tao subscription product (active)
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
- Bam `Nang cap ngay`
- Thanh toan sandbox thanh cong
- Vao Profile thay trang thai Premium
