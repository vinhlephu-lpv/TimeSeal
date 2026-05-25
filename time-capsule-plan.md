# Time Capsule App — Kế hoạch triển khai chi tiết
> React Native CLI · Firebase · Android (Google Play)  
> Mục tiêu: ship MVP trong **4 tuần**

---

## Mục lục
1. [Tổng quan app](#1-tổng-quan-app)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Schema Firebase](#3-schema-firebase)
4. [Màn hình & Navigation](#4-màn-hình--navigation)
5. [Chi tiết từng màn hình](#5-chi-tiết-từng-màn-hình)
6. [Firebase Setup](#6-firebase-setup)
7. [Cấu trúc thư mục](#7-cấu-trúc-thư-mục)
8. [Dependencies](#8-dependencies)
9. [Roadmap 4 tuần](#9-roadmap-4-tuần)
10. [Monetize & Launch](#10-monetize--launch)
11. [Checklist trước khi lên Play Store](#11-checklist-trước-khi-lên-play-store)

---

## 1. Tổng quan app

### One-liner
> "Gửi thư, ảnh, video cho chính mình hoặc bạn bè — mở ra vào đúng ngày bạn chọn."

### Core value
- Tạo capsule → khoá đến ngày chỉ định → nhận notification → mở và xem lại ký ức
- Gửi cho nhóm bạn (lớp học, team, gia đình)
- Viral tự nhiên: dịp Tết, sinh nhật, tốt nghiệp, kỷ niệm

### Tên app (gợi ý)
- **TimeSeal** — đơn giản, dễ nhớ
- **Khoảnh Khắc** — thuần Việt, cảm xúc
- **CapsuleMe** — quốc tế hoá được

### Freemium model
| | Free | Premium (29.000đ/tháng) |
|---|---|---|
| Số capsule | 3 | Không giới hạn |
| Dung lượng/capsule | 50MB | 500MB |
| Video | Không | Có |
| Capsule nhóm | Không | Có (tối đa 20 người) |
| Nhắc lịch nâng cao | Không | Có |

---

## 2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────┐
│           React Native App              │
│  (UI, Navigation, Local State)          │
└──────────┬──────────────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │        Firebase             │
    │                             │
    │  Auth        — đăng nhập    │
    │  Firestore   — data         │
    │  Storage     — ảnh/video    │
    │  FCM         — notification │
    │  Functions   — cron unlock  │
    └─────────────────────────────┘
```

### Luồng chính
```
User tạo capsule
  → Upload media lên Storage
  → Lưu metadata vào Firestore (status: locked)
  → Cloud Function chạy mỗi ngày 7:00 sáng
      → Query capsule có open_date <= hôm nay, status: locked
      → Đổi status: unlocked
      → Gửi FCM notification cho owner + members
  → User nhận thông báo → mở app → xem capsule
```

---

## 3. Schema Firebase

### Firestore Collections

#### `users/{userId}`
```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "photoURL": "string | null",
  "isPremium": false,
  "premiumExpiry": "timestamp | null",
  "capsuleCount": 0,
  "createdAt": "timestamp",
  "fcmToken": "string",
  "settings": {
    "notificationEnabled": true,
    "language": "vi"
  }
}
```

#### `capsules/{capsuleId}`
```json
{
  "id": "string",
  "ownerId": "string",
  "title": "string",
  "message": "string",
  "mediaUrls": ["string"],
  "mediaTypes": ["image | video"],
  "coverImageUrl": "string | null",
  "openDate": "timestamp",
  "createdAt": "timestamp",
  "status": "locked | unlocked | draft",
  "type": "personal | group",
  "members": ["userId1", "userId2"],
  "memberEmails": ["email1", "email2"],
  "openedBy": ["userId1"],
  "isPublic": false,
  "shareToken": "string (unique, dùng cho deep link)",
  "theme": "default | birthday | new_year | graduation"
}
```

#### `notifications/{notificationId}`
```json
{
  "userId": "string",
  "capsuleId": "string",
  "type": "capsule_unlocked | invited | reminder",
  "title": "string",
  "body": "string",
  "isRead": false,
  "createdAt": "timestamp"
}
```

#### `invites/{inviteToken}`
```json
{
  "capsuleId": "string",
  "invitedBy": "userId",
  "invitedEmail": "string | null",
  "token": "string",
  "status": "pending | accepted | expired",
  "expiresAt": "timestamp",
  "createdAt": "timestamp"
}
```

### Firebase Storage Structure
```
/capsules/{capsuleId}/
    cover.jpg
    media_0.jpg
    media_1.jpg
    media_2.mp4

/avatars/{userId}/
    profile.jpg
```

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users — chỉ đọc/sửa profile của mình
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Capsules
    match /capsules/{capsuleId} {
      // Đọc: owner hoặc member
      allow read: if request.auth.uid == resource.data.ownerId
                  || request.auth.uid in resource.data.members;
      // Tạo mới: đã đăng nhập
      allow create: if request.auth != null;
      // Sửa/xoá: chỉ owner
      allow update, delete: if request.auth.uid == resource.data.ownerId;
    }

    // Notifications — chỉ đọc của mình
    match /notifications/{notifId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Cloud Function — Unlock Capsule (cron hàng ngày)
```javascript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Chạy mỗi ngày lúc 7:00 sáng (UTC+7 = 00:00 UTC)
export const unlockCapsules = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db.collection('capsules')
      .where('status', '==', 'locked')
      .where('openDate', '<=', now)
      .get();

    const batch = db.batch();
    const notifications: Promise<any>[] = [];

    snapshot.forEach(doc => {
      const capsule = doc.data();
      // Unlock capsule
      batch.update(doc.ref, { status: 'unlocked' });

      // Gửi FCM cho owner + members
      const userIds = [capsule.ownerId, ...capsule.members];
      userIds.forEach(async (uid: string) => {
        const userDoc = await db.collection('users').doc(uid).get();
        const fcmToken = userDoc.data()?.fcmToken;
        if (fcmToken) {
          notifications.push(
            admin.messaging().send({
              token: fcmToken,
              notification: {
                title: '🎉 Capsule đã mở!',
                body: `"${capsule.title}" đã đến ngày mở rồi!`,
              },
              data: { capsuleId: doc.id },
              android: {
                priority: 'high',
                notification: { channelId: 'capsule_unlock' },
              },
            })
          );
        }
      });
    });

    await batch.commit();
    await Promise.allSettled(notifications);
  });
```

---

## 4. Màn hình & Navigation

### Stack tổng thể
```
App
├── AuthStack (chưa đăng nhập)
│   ├── SplashScreen
│   ├── OnboardingScreen (3 slide)
│   ├── LoginScreen
│   └── RegisterScreen
│
└── AppStack (đã đăng nhập)
    ├── BottomTabs
    │   ├── HomeScreen (danh sách capsule của tôi)
    │   ├── ExploreScreen (capsule công khai — v2)
    │   └── ProfileScreen
    │
    ├── CreateCapsuleStack
    │   ├── CreateStep1Screen (tiêu đề, ngày mở, theme)
    │   ├── CreateStep2Screen (viết thư, thêm ảnh)
    │   ├── CreateStep3Screen (thêm thành viên — premium)
    │   └── CreatePreviewScreen (xem trước + confirm)
    │
    ├── CapsuleDetailScreen (xem capsule đã mở)
    ├── CapsuleLockedScreen (xem capsule chưa đến ngày)
    ├── OpenCapsuleScreen (animation mở capsule)
    ├── NotificationsScreen
    ├── InviteAcceptScreen (deep link landing)
    └── SettingsScreen
```

### Bottom Tab Icons
| Tab | Icon | Badge |
|-----|------|-------|
| Trang chủ | home-outline | Số capsule chưa mở |
| Khám phá | compass-outline | — |
| Hồ sơ | person-outline | — |

---

## 5. Chi tiết từng màn hình

---

### SplashScreen
- Logo app + animation nhẹ (Lottie)
- Check auth state → redirect HomeScreen hoặc OnboardingScreen
- Duration: 1.5s

---

### OnboardingScreen
- 3 slide với Lottie animation:
  1. "Ghi lại khoảnh khắc ý nghĩa"
  2. "Khoá đến ngày bạn chọn"
  3. "Mở ra — sống lại ký ức đó"
- Nút "Bắt đầu" → LoginScreen

---

### LoginScreen / RegisterScreen
- Đăng nhập: Email + Password
- Đăng nhập: Google Sign-In (bắt buộc có)
- Register: tên hiển thị + email + password
- "Quên mật khẩu" → Firebase reset email

---

### HomeScreen
**Header:** "Capsule của tôi" + nút chuông (notifications) + nút `+`

**Sections:**
```
[🎉 Mở ngay!]          ← capsule unlocked chưa xem
  └── Capsule card (highlight màu vàng/cam)

[⏳ Đang chờ]           ← capsule còn locked
  └── Capsule card (mờ, hiển thị countdown)

[📦 Đã mở]             ← đã xem rồi
  └── Capsule card (normal)
```

**Capsule Card:**
- Cover image (blur nếu locked) hoặc gradient theme
- Tiêu đề capsule
- Ngày mở / Countdown "còn X ngày"
- Tag: 👤 Cá nhân / 👥 Nhóm (X người)
- Lock icon nếu chưa đến ngày

**Empty state:** Illustration + "Tạo capsule đầu tiên của bạn"

---

### CreateCapsuleStack

#### Step 1 — Thông tin cơ bản
```
Tiêu đề capsule *
[___________________________]

Ngày mở *
[  📅  01/01/2026           ]   ← DatePicker

Chủ đề giao diện
[ Mặc định ] [ 🎂 Sinh nhật ] [ 🎆 Năm mới ] [ 🎓 Tốt nghiệp ]

                              [Tiếp theo →]
```

**Validation:**
- Tiêu đề: bắt buộc, max 60 ký tự
- Ngày mở: phải sau hôm nay ít nhất 1 ngày

#### Step 2 — Nội dung capsule
```
Lời nhắn
┌─────────────────────────────────┐
│ Viết điều bạn muốn nhớ...       │
│                                 │
│                                 │
└─────────────────────────────────┘
(0/500 ký tự)

Thêm ảnh  [📷 Chụp] [🖼️ Thư viện]
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │ │ + │   ← max 5 ảnh (free) / 20 ảnh (premium)
└───┘ └───┘ └───┘ └───┘

              [← Quay lại] [Tiếp theo →]
```

#### Step 3 — Thêm thành viên (Premium)
```
[👑 Tính năng Premium]

Mời bạn bè cùng capsule này
[nhập email hoặc tìm theo tên...]

Đã thêm:
• Nguyễn Văn A  [x]
• Trần Thị B    [x]

              [← Quay lại] [Tiếp theo →]
```

#### CreatePreview — Xem trước + Xác nhận
```
[Preview card capsule]

📅 Sẽ mở vào: 01/01/2026
👥 Người nhận: Bạn + 2 người
📎 1 lời nhắn · 3 ảnh

⚠️ Sau khi tạo, bạn không thể chỉnh sửa nội dung.

          [Huỷ]    [🔒 Tạo & Khoá Capsule]
```

---

### CapsuleLockedScreen
```
        🔒
   [Blur cover image]

   "Ký ức mùa hè 2024"
   
   Mở vào: 01/06/2025
   
   ┌──────────────────────┐
   │   Còn  127  ngày     │
   │   05   giờ   23  phút│
   └──────────────────────┘

   [🔗 Chia sẻ link mời]   [← Về trang chủ]
```

---

### OpenCapsuleScreen (Animation)
- Trigger khi user tap capsule đã unlocked lần đầu
- Animation: phong bì mở ra (Lottie) → 2–3 giây → fade vào nội dung
- Sound effect nhẹ (optional)
- Sau animation → chuyển sang CapsuleDetailScreen

---

### CapsuleDetailScreen
```
[Cover image full width]

"Ký ức mùa hè 2024"
Tạo ngày 15/06/2024 · Mở ngày 15/06/2025

─────────────────────────────

💌 Lời nhắn
"Hè này thật tuyệt vời, bọn mình đã..."

─────────────────────────────

📷 Ảnh & Video (3)
[img1] [img2] [img3]

─────────────────────────────

👥 Thành viên (3 người)
[avatar] [avatar] [avatar]

─────────────────────────────

     [📤 Chia sẻ]    [⬇️ Lưu ảnh]
```

---

### ProfileScreen
```
[Avatar]
Nguyễn Văn A
nguyenvana@gmail.com

[👑 Nâng cấp Premium]   ← nếu free

──────────────────
📦 Tổng capsule:    12
🔒 Đang chờ:         5
🎉 Đã mở:            7
──────────────────

⚙️ Cài đặt thông báo
🌙 Giao diện tối/sáng
📄 Điều khoản & Chính sách
🚪 Đăng xuất
```

---

## 6. Firebase Setup

### Bước 1 — Tạo project
```bash
# Truy cập console.firebase.google.com
# New project: "TimeCapsule" (hoặc tên app của bạn)
# Enable Google Analytics: có
```

### Bước 2 — Thêm Android app
```
Package name: com.yourname.timecapsule
App nickname: Time Capsule Android
Download google-services.json → đặt vào android/app/
```

### Bước 3 — Enable các services
```
Authentication  → Email/Password + Google
Firestore       → Production mode
Storage         → Production mode
Cloud Messaging → Enable
Functions       → Enable (billing required — Blaze plan)
```

### Bước 4 — Firestore Indexes (cần tạo thủ công)
```
Collection: capsules
Fields: ownerId (Asc) + createdAt (Desc)   → HomeScreen query
Fields: status (Asc) + openDate (Asc)      → Cloud Function query
Fields: members (Array) + status (Asc)     → Group capsule query
```

### Bước 5 — Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /capsules/{capsuleId}/{allPaths=**} {
      // Chỉ owner mới upload được
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 50 * 1024 * 1024; // 50MB
    }
    match /avatars/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024; // 5MB
    }
  }
}
```

---

## 7. Cấu trúc thư mục

```
src/
├── api/
│   ├── capsules.ts        ← CRUD capsule
│   ├── users.ts           ← user profile
│   ├── notifications.ts   ← notifications
│   └── storage.ts         ← upload/download media
│
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   ├── LoadingOverlay.tsx
│   │   └── EmptyState.tsx
│   ├── capsule/
│   │   ├── CapsuleCard.tsx
│   │   ├── CapsuleCountdown.tsx
│   │   ├── MediaGrid.tsx
│   │   └── ThemeSelector.tsx
│   └── modals/
│       ├── ConfirmModal.tsx
│       └── PremiumModal.tsx
│
├── hooks/
│   ├── useAuth.ts         ← auth state
│   ├── useCapsules.ts     ← capsule list + real-time
│   ├── useUpload.ts       ← upload media với progress
│   └── useNotifications.ts
│
├── navigation/
│   ├── AppNavigator.tsx   ← root navigator
│   ├── AuthStack.tsx
│   ├── AppStack.tsx
│   └── BottomTabs.tsx
│
├── screens/
│   ├── auth/
│   │   ├── SplashScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── home/
│   │   └── HomeScreen.tsx
│   ├── capsule/
│   │   ├── CreateStep1Screen.tsx
│   │   ├── CreateStep2Screen.tsx
│   │   ├── CreateStep3Screen.tsx
│   │   ├── CreatePreviewScreen.tsx
│   │   ├── CapsuleDetailScreen.tsx
│   │   ├── CapsuleLockedScreen.tsx
│   │   └── OpenCapsuleScreen.tsx
│   ├── notifications/
│   │   └── NotificationsScreen.tsx
│   └── profile/
│       ├── ProfileScreen.tsx
│       └── SettingsScreen.tsx
│
├── store/
│   ├── authStore.ts       ← Zustand (hoặc Context)
│   └── capsuleStore.ts
│
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
│
├── types/
│   ├── capsule.types.ts
│   ├── user.types.ts
│   └── navigation.types.ts
│
└── utils/
    ├── dateHelpers.ts     ← format ngày, countdown
    ├── permissions.ts     ← camera, storage permissions
    └── shareHelpers.ts    ← tạo share link
```

---

## 8. Dependencies

### Cài đặt
```bash
# Core navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Firebase
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/storage
npm install @react-native-firebase/messaging

# Google Sign-In
npm install @react-native-google-signin/google-signin

# Media
npm install react-native-image-picker
npm install react-native-video
npm install react-native-view-shot        ← screenshot share card
npm install react-native-fast-image       ← image caching

# UI & Animation
npm install react-native-reanimated
npm install react-native-lottie           ← splash + mở capsule animation
npm install react-native-linear-gradient
npm install @shopify/flash-list           ← FlatList hiệu năng cao
npm install react-native-modal

# Date
npm install @react-native-community/datetimepicker
npm install date-fns                      ← format ngày

# State
npm install zustand

# Utils
npm install react-native-share
npm install @react-native-async-storage/async-storage
npm install react-native-permissions

# Deep link
npm install react-native-dynamic-links   ← Firebase Dynamic Links
```

### android/app/build.gradle — thêm vào
```gradle
apply plugin: 'com.google.gms.google-services'
```

### android/build.gradle — thêm vào
```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

---

## 9. Roadmap 4 tuần

### Tuần 1 — Nền tảng
**Mục tiêu:** Auth chạy + tạo capsule cơ bản được

```
[ ] Setup project React Native CLI (Android)
[ ] Cài đặt Firebase + google-services.json
[ ] Setup React Navigation (Stack + Bottom Tabs)
[ ] Setup Zustand store
[ ] Setup theme (colors, typography, spacing)
[ ] Build SplashScreen + Onboarding (3 slide)
[ ] Build LoginScreen + RegisterScreen
    [ ] Email/Password auth
    [ ] Google Sign-In
[ ] Build HomeScreen (UI skeleton, list rỗng)
[ ] Build CreateStep1Screen (title + date picker + theme)
[ ] Build CreateStep2Screen (text + ảnh picker)
[ ] Lưu capsule vào Firestore (không có media trước)
[ ] Hiển thị capsule list từ Firestore
```

---

### Tuần 2 — Tính năng cốt lõi
**Mục tiêu:** Upload ảnh + lock/unlock + notification

```
[ ] Upload ảnh lên Firebase Storage
    [ ] Progress indicator khi upload
    [ ] Compress ảnh trước khi upload (react-native-image-picker config)
[ ] Build CapsuleLockedScreen (blur + countdown)
[ ] Build CapsuleDetailScreen (xem nội dung đầy đủ)
[ ] Build OpenCapsuleScreen (Lottie animation mở phong bì)
[ ] Setup FCM (Firebase Cloud Messaging)
    [ ] Xin permission notification Android
    [ ] Lưu FCM token vào Firestore
    [ ] Handle notification khi app foreground/background/killed
[ ] Deploy Cloud Function unlock capsule (cron job)
[ ] Test luồng đầy đủ: tạo → lock → đợi → unlock → notification → mở
[ ] Build NotificationsScreen (list thông báo)
```

---

### Tuần 3 — Social + Polish
**Mục tiêu:** Share, invite, premium UI, UX hoàn chỉnh

```
[ ] Build CreateStep3Screen (mời thành viên — chỉ UI, logic v2)
[ ] Share link capsule (Firebase Dynamic Links)
    [ ] Tạo share link unique per capsule
    [ ] Handle deep link khi nhấn link
    [ ] InviteAcceptScreen (landing page trong app)
[ ] Build ProfileScreen
[ ] Build SettingsScreen (thông báo on/off)
[ ] Share card (chụp màn hình kết quả → share)
[ ] Build PremiumModal (upsell screen)
[ ] Empty states đẹp (Lottie hoặc illustration)
[ ] Loading states + skeleton screens
[ ] Error handling toàn app (toast messages)
[ ] Dark mode cơ bản
```

---

### Tuần 4 — QA + Launch
**Mục tiêu:** Bug fix + submit Play Store

```
[ ] Test toàn bộ luồng trên 3 thiết bị Android thật
    [ ] Android 9 (API 28)
    [ ] Android 11 (API 30)
    [ ] Android 13 (API 33)
[ ] Fix bug từ test
[ ] Performance: kiểm tra FlatList lag, image load
[ ] Kiểm tra Firestore rules (không bị lộ data)
[ ] Kiểm tra Storage rules
[ ] Tối ưu APK/AAB size
[ ] Tạo app icon (512x512) + feature graphic (1024x500)
[ ] Chụp screenshots (tối thiểu 4 ảnh)
[ ] Viết Store listing (tiếng Việt)
[ ] Tạo Privacy Policy (termsfeed.com — free)
[ ] Submit lên Google Play Console
    [ ] Internal Testing trước
    [ ] Closed Testing (beta)
    [ ] Production
```

---

## 10. Monetize & Launch

### Giai đoạn 1 — Miễn phí hoàn toàn (tháng 1)
- Không chặn gì — để user dùng tự nhiên, thu thập feedback
- Mục tiêu: 500 install đầu tiên

### Giai đoạn 2 — Bật giới hạn (tháng 2)
- Free: giới hạn 3 capsule, không có video, không có nhóm
- Thêm nút "Nâng cấp Premium" ở các điểm chặn

### Giai đoạn 3 — In-App Purchase (tháng 2–3)
```bash
npm install react-native-purchases  ← RevenueCat SDK
```
- Setup RevenueCat → kết nối Google Play Billing
- Subscription: 29.000đ/tháng hoặc 199.000đ/năm
- A/B test giá: 29k vs 49k

### Chiến lược viral theo mùa
| Thời điểm | Chiến dịch |
|-----------|------------|
| Trước Tết (tháng 12) | "Gửi lời chúc Tết cho người thân — mở đúng Giao Thừa" |
| Trước 20/11 | "Gửi cảm ơn thầy cô — mở ngày 20/11" |
| Mùa tốt nghiệp (tháng 5–6) | "Ghi lại ký ức lớp 12 — mở 10 năm sau" |
| Sinh nhật | "Gửi trước sinh nhật bạn thân" |

### Kênh marketing (miễn phí)
- TikTok: quay video "tạo capsule gửi cho mình 1 năm sau"
- Facebook Groups: nhóm lớp học, hội cựu học sinh
- ASO: từ khoá "gửi thư tương lai", "time capsule", "ký ức"

---

## 11. Checklist trước khi lên Play Store

### Kỹ thuật
- [ ] `minSdkVersion 26` (Android 8.0+)
- [ ] `targetSdkVersion 34` (bắt buộc từ 2024)
- [ ] Proguard rules đúng cho Firebase
- [ ] Release keystore đã tạo và backup an toàn
- [ ] AAB (Android App Bundle) thay vì APK
- [ ] Không có crash khi cold start
- [ ] App không bị ANR (Application Not Responding)

### Google Play Console
- [ ] Developer account ($25 một lần)
- [ ] App bundle upload thành công
- [ ] Content rating questionnaire
- [ ] Target audience: 13+
- [ ] Privacy policy URL
- [ ] Data safety form (khai báo dùng camera, storage, email)
- [ ] Screenshots: phone (4 ảnh tối thiểu)
- [ ] Feature graphic: 1024x500px
- [ ] App icon: 512x512px

### Pháp lý
- [ ] Privacy Policy (bắt buộc — dùng termsfeed.com)
- [ ] Terms of Service
- [ ] Khai báo dữ liệu thu thập: email, ảnh, FCM token

---

## Tips & Gotchas

### Firebase
```
⚠️ Cloud Functions cần Blaze plan (trả tiền)
   → Nhưng free tier rất rộng, hầu như không tốn tiền lúc đầu

⚠️ Firestore onSnapshot (realtime) tốn quota nhiều hơn get()
   → Chỉ dùng realtime cho HomeScreen, còn lại dùng get()

⚠️ Storage download URL có thể expire
   → Lưu URL vào Firestore ngay sau khi upload xong
```

### React Native
```
⚠️ react-native-video trên Android cần ExoPlayer config
   → Xem docs: https://thewidlarzgroup.github.io/react-native-video

⚠️ Notification permission trên Android 13+ phải xin runtime
   → Dùng react-native-permissions

⚠️ DateTimePicker style khác nhau giữa Android versions
   → Test kỹ trên Android 9, 11, 13
```

### Performance
```
✅ Dùng @shopify/flash-list thay FlatList cho danh sách dài
✅ Compress ảnh xuống max 1080px trước khi upload
✅ Lazy load video — không autoplay trong list
✅ Memo các component card để tránh re-render
```

---

*Plan version 1.0 — Tạo tháng 04/2026*  
*Stack: React Native CLI · Firebase · Android*
