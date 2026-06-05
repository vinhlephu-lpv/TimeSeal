# TimeSeal Subscription QA Checklist

Chay checklist nay bang tai khoan Google Play license tester sau khi:

1. Deploy `revenuecatWebhook` va `firestore.rules`.
2. Kiem tra RevenueCat offering co 3 custom package rieng.
3. Cai AAB moi tu Internal testing.

## Product mapping

- [ ] Chon Plus -> Google Billing hien `timeseal_plus_monthly`, gia 29.000 VND.
- [ ] Chon Pro -> Google Billing hien `timeseal_pro_monthly`, gia 79.000 VND.
- [ ] Chon Pro Max -> Google Billing hien `timeseal_promax_monthly`, gia 199.000 VND.
- [ ] Khong goi nao fallback sang package dau tien neu package bi cau hinh thieu.

## Entitlement

- [ ] Fresh install -> login -> trang thai Free.
- [ ] Mua Plus -> Profile doi sang Plus ngay, khong restart app.
- [ ] Restart app -> Plus van active.
- [ ] Logout/login lai cung UID -> Plus van active.
- [ ] Logout/login UID khac -> khong ro ri quyen Plus.
- [ ] Plus -> Pro -> quyen Pro active ngay.
- [ ] Pro -> Pro Max -> quyen Pro Max active ngay.
- [ ] Pro Max -> huy -> mua Plus: Plus khong bi lich su Pro Max de len.
- [ ] Plus -> huy -> logout/login -> mua lai Plus: trao quyen ngay.

## Lifecycle

- [ ] Huy auto-renew -> van giu quyen den `expiration_at_ms`.
- [ ] App dang mo khi huy -> hien thong bao da huy gia han.
- [ ] Renewal -> cap nhat expiration chinh xac va hien thong bao gia han.
- [ ] Billing issue -> hien canh bao, khong thu hoi quyen som.
- [ ] Expiration -> chuyen Free dung luc.
- [ ] Resubscribe sau expiration -> trao quyen ngay.
- [ ] Foreground app -> refresh CustomerInfo, khong can polling.

## Listener safety

- [ ] Navigate qua lai cac man hinh -> khong them duplicate listener.
- [ ] Logout/login UID khac -> listener UID cu duoc thao.
- [ ] Khong co render loop, polling loop, crash hoac lag bat thuong.
