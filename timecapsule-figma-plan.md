# Time Capsule App — Figma Screen Design Plan
> Stack: React Native CLI · Firebase · Android  
> Frame chuẩn: **390 × 844px** (iPhone 14)  
> Tổng số màn hình: **17 screens**

---

## Hệ thống màu (Color System)

| Token | Hex | Dùng cho |
|---|---|---|
| Primary | `#534AB7` | Buttons chính, accent, step indicator active |
| Primary Light | `#7F77DD` | Dots active, hover state |
| Primary Pale | `#CECBF6` | Dots inactive, background nhẹ |
| Success | `#0F6E56` | Section headers, confirm actions |
| Success Mid | `#1D9E75` | Toggle on, accent teal |
| Warning | `#BA7517` | Step indicator Create flow |
| Warning Light | `#EF9F27` | Countdown, unlocked highlight, crown icon |
| Danger | `#E24B4A` | Error states, warning text |
| Coral | `#D85A30` | Capsule screens accent |
| Info | `#185FA5` | Notification, utility screens |
| Info Light | `#E6F1FB` | Unread notification bg |
| Gray Text | `#888780` | Muted / secondary text |
| Gray Border | `#D3D1C7` | Dividers, inactive |
| Black | `#0F0F0F` | Card backgrounds dark |

---

## Component Library (tạo trước khi vẽ màn hình)

Tạo các shared components sau trong Figma trước, dùng chung toàn app:

- **Button/Primary** — full width 56px height, border-radius 14px, `#534AB7` bg, white text
- **Button/Outlined** — same size, transparent bg, `#534AB7` border 1.5px
- **Button/Text** — no border, no bg, `#534AB7` text
- **Button/Google** — white bg, 1px gray border, Google logo 20px + text
- **Input/Default** — 52px height, border-radius 12px, 1px border `#D3D1C7`, 16px padding, icon slot left
- **Input/Error** — same + border `#E24B4A` + error message 12px below
- **Input/Focused** — border `#534AB7`
- **CapsuleCard** — 390×120px (full width), border-radius 16px, cover image left + info right
- **CapsuleCard/Locked** — blur overlay + countdown text + lock icon
- **CapsuleCard/Unlocked** — yellow/orange highlight border + badge "Mở ngay!"
- **CapsuleCard/Opened** — normal style, muted
- **Avatar** — circle, sizes: 32px / 48px / 72px
- **Tag/Premium** — `#FBEAF0` bg, `#4B1528` text, 99px border-radius
- **SectionHeader** — 13px uppercase, `#1D9E75` color, 16px padding
- **StepIndicator** — 4 dots, 8px each, active = `#534AB7`, inactive = `#CECBF6`
- **PremiumBanner** — gradient `#534AB7` → `#7F77DD`, crown icon, white text, CTA button
- **EmptyState** — illustration (Lottie placeholder) + heading + CTA button
- **BottomTabBar** — 3 tabs: Home / Explore / Profile, icon 24px + label 10px
- **NotificationItem** — icon type 20px + title 14px bold + body 13px + time 12px muted
- **MenuItem** — full width, 52px height, icon left + label + chevron right (optional)
- **Toggle/Switch** — Android style, on = `#1D9E75`, off = `#D3D1C7`
- **CountdownBox** — card style, 3 columns: ngày / giờ / phút, số lớn 28px bold

---

## Navigation Structure

```
App
├── AuthStack
│   ├── SplashScreen
│   ├── OnboardingScreen
│   ├── LoginScreen
│   └── RegisterScreen
│
└── AppStack
    ├── BottomTabs
    │   ├── [Tab 1] HomeScreen
    │   ├── [Tab 2] ExploreScreen
    │   └── [Tab 3] ProfileScreen
    │
    ├── CreateCapsuleStack
    │   ├── CreateStep1Screen
    │   ├── CreateStep2Screen
    │   ├── CreateStep3Screen (Premium)
    │   └── CreatePreviewScreen
    │
    ├── CapsuleLockedScreen
    ├── OpenCapsuleScreen (Animation)
    ├── CapsuleDetailScreen
    ├── NotificationsScreen
    ├── InviteAcceptScreen
    └── SettingsScreen
```

---

## Auth Stack

---

### 1. SplashScreen

**Frame:** 390 × 844 · **Nav:** Stack fullscreen · **Animation:** Lottie

**Layout (top → bottom, center aligned):**
- Full screen background: gradient dọc tối `#0F0F0F` → `#1a1a2e`
- Logo / App icon: 96×96px, center màn hình, Lottie fade in + scale nhẹ
- App name text: 22px, white, font-weight 500, 16px below logo
- Tagline: 13px, `#888780`, 8px below app name
- No input elements

**States:**
- `Loading` — logo animate, không có gì khác
- `Auth OK` → auto navigate HomeScreen sau 1.5s
- `No Auth` → auto navigate OnboardingScreen sau 1.5s

**Dev note:** StatusBar transparent + light content. File Lottie: `splash_logo.json`

---

### 2. OnboardingScreen

**Frame:** 390 × 844 · **Nav:** Stack (sau Splash) · **Animation:** Lottie per slide

**Layout:**
- Skip button: top right, 14px, `#888780`, padding 16px (ẩn ở slide 3)
- Lottie animation area: top 55% màn hình, center
- Heading: 22px, font-weight 500, center, 24px margin top
- Body text: 15px, `#888780`, center, max 2 dòng, padding ngang 32px
- Page dots: 3 dots 8px, gap 8px, center, active = `#534AB7` filled, inactive = `#CECBF6`
- Button: primary full width, 56px, bottom 48px từ safe area
  - Slide 1-2: label "Tiếp theo →"
  - Slide 3: label "Bắt đầu"

**Slide content:**
1. "Ghi lại khoảnh khắc ý nghĩa" — animation: camera/photo vibes
2. "Khoá đến ngày bạn chọn" — animation: lock closing
3. "Mở ra — sống lại ký ức đó" — animation: envelope opening

**States:** `Slide 1` / `Slide 2` / `Slide 3`

**Dev note:** FlatList ngang + snapToInterval. Swipe được. onScroll update dots.

---

### 3. LoginScreen

**Frame:** 390 × 844 · **Nav:** Stack

**Layout (top → bottom):**
- Top padding: 64px (safe area)
- Logo nhỏ: 48px, center
- Heading "Đăng nhập": 24px, font-weight 500, 24px margin top
- Input Email: margin top 32px
- Input Password: margin top 12px, icon lock + toggle show/hide mắt
- Link "Quên mật khẩu?": right align, 13px, `#534AB7`, margin top 8px
- Button "Đăng nhập": primary, margin top 24px
- Divider "hoặc": center, line 2 bên, `#D3D1C7`, 20px margin
- Button Google Sign-In: outlined, Google logo 20px left, text "Tiếp tục với Google"
- Link "Chưa có tài khoản? Đăng ký": center, margin top 24px, "Đăng ký" = `#534AB7`

**States:**
- `Default` — tất cả trống
- `Loading` — spinner thay text trong button primary, buttons disabled
- `Error` — border đỏ input + error message 12px bên dưới
- `Success` → navigate HomeScreen

**Dev note:** KeyboardAvoidingView bọc form. Inputs `returnKeyType='next'`.

---

### 4. RegisterScreen

**Frame:** 390 × 844 · **Nav:** Stack push từ Login

**Layout:**
- Back button: top left 16px
- Heading "Tạo tài khoản": 24px, margin top 16px
- Input Tên hiển thị: margin top 32px, placeholder "Nguyễn Văn A"
- Input Email: margin top 12px
- Input Password: margin top 12px
- Input Xác nhận Password: margin top 12px
- Button "Đăng ký": primary, margin top 28px
- Link "Đã có tài khoản? Đăng nhập": center, margin top 16px

**States:** `Default` / `Validation errors inline` / `Loading` / `Success → Home`

**Dev note:** Tên max 30 ký tự. Password min 6 ký tự. Xác nhận phải khớp Password.

---

## App Stack / Bottom Tabs

---

### 5. HomeScreen

**Frame:** 390 × 844 · **Nav:** Bottom Tab 1

**Layout:**
- Header bar 56px: text "Capsule của tôi" (18px, 500) | icon chuông (badge đỏ số) | icon + (24px)
- SectionList, 3 sections:
  - Section "🎉 Mở ngay!" — header `#1D9E75` 13px uppercase
  - Section "⏳ Đang chờ" — header `#888780` 13px uppercase
  - Section "📦 Đã mở" — header `#888780` 13px uppercase
- CapsuleCard: full width, 120px height, margin ngang 16px, margin bottom 12px
- FAB button "+": 56px circle, `#534AB7`, bottom right, 24px margin từ edge, shadow
- BottomTabBar: fixed bottom

**CapsuleCard anatomy:**
- Cover image: 90×90px, border-radius 12px, left 16px
- Locked card: blurRadius 20 + dark overlay + lock icon 16px center ảnh
- Unlocked card: border 2px `#EF9F27` toàn card
- Title: 15px, font-weight 500, 12px from top
- Ngày mở / Countdown: 13px, `#888780`
- Tag: 11px pill — "Cá nhân" gray / "Nhóm X người" purple
- Lock icon: 16px, right side, nếu locked

**States:**
- `Empty` — EmptyState component, không có FAB (optional: vẫn có FAB)
- `Has locked only` — chỉ hiện section Đang chờ
- `Has unlocked` — tab badge số đỏ
- `Mix all 3` — full layout

**Dev note:** Tab badge = số capsule status `unlocked` chưa có trong `openedBy`. Pull-to-refresh.

---

### 6. ExploreScreen

**Frame:** 390 × 844 · **Nav:** Bottom Tab 2

**Layout:**
- Header "Khám phá": 18px, 500
- Center: Lottie/illustration placeholder + heading "Tính năng sắp ra mắt" + body text mô tả
- Button "Nhận thông báo khi ra mắt": outlined, optional

**States:** `Coming soon` (single state)

**Dev note:** V2 feature. MVP chỉ cần 1 màn placeholder đẹp.

---

### 7. ProfileScreen

**Frame:** 390 × 844 · **Nav:** Bottom Tab 3 + ScrollView

**Layout (top → bottom):**
- Top padding 24px (safe area)
- Avatar: 72px circle, center, tap → image picker action sheet
- Tên hiển thị: 18px, 500, center, 12px below avatar
- Email: 13px, `#888780`, center, 4px below tên
- PremiumBanner: margin top 20px, chỉ hiện nếu free user, border-radius 16px
- Stats row: 3 cards ngang, gap 12px, margin top 20px, margin ngang 16px
  - "Tổng capsule" / "Đang chờ" / "Đã mở" — label 11px + số 24px 500
- Divider: margin top 20px
- Menu list: padding ngang 16px
  - "⚙️ Cài đặt thông báo" → SettingsScreen
  - "🌙 Giao diện tối/sáng" → toggle inline hoặc SettingsScreen
  - "📄 Điều khoản & Chính sách" → WebView
  - "🚪 Đăng xuất" → confirm dialog, `#E24B4A` text

**States:**
- `Free user` — PremiumBanner hiện
- `Premium user` — PremiumBanner ẩn, crown badge nhỏ cạnh tên
- `Loading avatar` — skeleton circle

---

## Create Capsule Stack

> 4 bước liền mạch, dùng StepIndicator ●●●● ở mỗi màn

---

### 8. CreateStep1Screen — Thông tin cơ bản

**Frame:** 390 × 844 · **Nav:** Stack push từ FAB/icon +

**Layout:**
- Header: back "←" left + text "Huỷ" right (màu `#E24B4A`)
- StepIndicator ●○○○: center, 20px below header
- Label "Tiêu đề capsule *": 13px, `#888780`, margin top 28px
- Input tiêu đề: full width, character counter "0/60" right align below
- Label "Ngày mở *": margin top 20px
- DatePicker field: 52px, icon calendar left, value hoặc placeholder "Chọn ngày"
- Label "Chủ đề giao diện": margin top 20px
- Theme chips row: 4 chips ngang, gap 8px, scroll ngang nếu cần
  - Chip anatomy: 32px height, border-radius 99px, icon emoji 16px + text 13px
  - Default / 🎂 Sinh nhật / 🎆 Năm mới / 🎓 Tốt nghiệp
  - Selected: border 2px `#534AB7`, bg `#EEEDFE`
- Button "Tiếp theo →": primary, bottom, disabled (opacity 40%) nếu chưa đủ

**States:** `Empty (disabled button)` / `Filled valid` / `Date invalid error` / `Theme selected`

**Dev note:** DatePicker min = today + 1 ngày. Mở DatePicker bằng tap vào field.

---

### 9. CreateStep2Screen — Nội dung capsule

**Frame:** 390 × 844 · **Nav:** Stack

**Layout:**
- Header: back "←" + "Huỷ"
- StepIndicator ●●○○
- Label "Lời nhắn": margin top 24px
- TextArea: border-radius 12px, 4 visible lines (~100px), max 500 ký tự
- Counter "0/500": right align, 12px, `#888780`, below textarea
- Label "Thêm ảnh": margin top 20px
- Action row: button "📷 Chụp" outlined small + button "🖼️ Thư viện" outlined small
- Media grid: row of 80×80px squares, border-radius 12px, gap 8px, wrap
  - Ô ảnh: thumbnail + nút "×" 20px circle top-right
  - Ô "+": dashed border `#D3D1C7`, icon + center
- Upsell text: "Free: tối đa 5 ảnh | Premium: tối đa 20 ảnh" — 11px, `#888780`, center
- Buttons bottom: "← Quay lại" (outlined, 48%) + "Tiếp theo →" (primary, 48%), gap 12px

**States:**
- `No media` — chỉ ô "+"
- `1-4 ảnh` — thumbnails + ô "+"
- `Full free (5 ảnh)` — ô "+" đổi thành upsell icon ★
- `Uploading` — progress bar mỏng top card

**Dev note:** Ảnh compress max 1080px trước upload. Action sheet khi tap nút thêm ảnh.

---

### 10. CreateStep3Screen — Thêm thành viên

**Frame:** 390 × 844 · **Nav:** Stack · **Premium only**

**Layout:**
- Header: back "←" + "Huỷ"
- StepIndicator ●●●○
- PremiumBanner (nếu free user): nổi bật, CTA "Nâng cấp Premium"
- Label "Mời bạn bè cùng capsule này": margin top 24px
- Input search: disabled + lock icon nếu free, enabled nếu premium
- Counter "0/20 thành viên": right align, 12px
- List người đã thêm: avatar 32px + tên 14px + email 12px muted + button "×" right
- Buttons: "← Quay lại" + "Tiếp theo →"

**States:**
- `Free (locked)` — overlay mờ trên input + upsell modal khi tap
- `Premium empty` — input active, list trống
- `Premium có members` — list populated

**Dev note:** Tap upsell → PremiumModal. Step này có thể bỏ qua (Next luôn active).

---

### 11. CreatePreviewScreen — Xem trước & xác nhận

**Frame:** 390 × 844 · **Nav:** Stack

**Layout:**
- Header: back "←" + "Huỷ"
- StepIndicator ●●●●
- Label "Xem trước": margin top 24px
- Preview card: 358×160px, border-radius 16px, hiển thị như CapsuleCard thật (theme applied)
- Metadata block: margin top 16px, padding 16px, bg secondary, border-radius 12px
  - "📅 Sẽ mở vào: DD/MM/YYYY"
  - "👥 Người nhận: Bạn + X người" (nếu có members)
  - "📎 X lời nhắn · X ảnh"
- Warning text: "⚠️ Sau khi tạo, bạn không thể chỉnh sửa nội dung." — 13px, `#E24B4A`
- Button "Huỷ": outlined, 48% width
- Button "🔒 Tạo & Khoá Capsule": primary, 48% width

**States:**
- `Default` — review mode
- `Creating` — loading spinner trong button, buttons disabled
- `Success` → pop về HomeScreen + toast "Capsule đã được khoá!"

---

## Capsule Screens

---

### 12. CapsuleLockedScreen

**Frame:** 390 × 844 · **Nav:** Stack push từ HomeScreen card

**Layout:**
- Back button: top left, icon trên ảnh, bg semi-transparent
- Hero image: full width 390×340px, blurRadius 20, overlay đen 70%
- Lock icon: 40px, white, center của ảnh hero
- Tiêu đề capsule: 20px, 500, white, center, 24px below hero
- Text "Mở vào: DD/MM/YYYY": 13px, `#888780`, center, 8px below tiêu đề
- CountdownBox: margin top 16px, center, 3 cols — "127 ngày / 05 giờ / 23 phút"
  - Số: 28px, 500, `#EF9F27`
  - Label: 11px, `#888780`
- Button "🔗 Chia sẻ link mời": outlined, white, border white, center, margin top 24px
- Button "← Về trang chủ": text link, `#888780`, center, margin top 12px

**States:**
- `Personal locked` — không có section thành viên
- `Group locked` — row avatar thành viên 32px bên dưới tiêu đề

**Dev note:** Countdown update mỗi giây. Không có delete từ màn này.

---

### 13. OpenCapsuleScreen

**Frame:** 390 × 844 · **Nav:** Stack modal fullscreen · **Animation:** Lottie

**Layout:**
- Background: full black `#0F0F0F`
- Lottie animation phong bì mở: 240×240px, center màn hình
- Text fade in "Khoảnh khắc đã trở về...": 17px, white, center, fade in sau 1s
- Auto-navigate → CapsuleDetailScreen sau khi animation xong (~2.5s)

**States:** `Playing` → `Auto-navigate`

**Dev note:** Chỉ hiện lần đầu xem capsule (kiểm tra `openedBy` array). Sau xem: thêm userId vào `openedBy`. File Lottie: `envelope_open.json`

---

### 14. CapsuleDetailScreen

**Frame:** 390 × 844 · **Nav:** Stack + ScrollView

**Layout:**
- Cover image: 390×220px full width, parallax scroll optional
- Back button: top left, icon trên ảnh, bg semi-transparent tròn 36px
- Tiêu đề: 20px, 500, margin top 16px, padding ngang 16px
- Metadata: "Tạo ngày X · Mở ngày Y" — 13px, `#888780`, padding 16px
- Divider
- Section "💌 Lời nhắn": header SectionHeader + body text 15px, line-height 1.7, padding 16px
- Divider
- Section "📷 Ảnh & Video (X)": header + grid 3 cột, gap 4px, ảnh square crop, tap → lightbox
- Divider
- Section "👥 Thành viên (X người)": header + avatar row 48px + tên 13px bên dưới
- Action bar: fixed bottom 72px, 2 buttons: "📤 Chia sẻ" + "⬇️ Lưu ảnh"

**States:**
- `Personal` — không có section Thành viên
- `Group` — có Thành viên + badge "X/Y đã xem"

**Dev note:** Lightbox: full screen, swipe ngang, pinch to zoom. Lưu ảnh cần permission `WRITE_EXTERNAL_STORAGE`.

---

## Utility Screens

---

### 15. NotificationsScreen

**Frame:** 390 × 844 · **Nav:** Stack từ bell icon

**Layout:**
- Header: "Thông báo" 18px + button "Đánh dấu đọc hết" right, 13px `#534AB7`
- FlatList notification items
- NotificationItem (72px height): icon type 20px left + content + time 12px `#888780` right
  - Icon: 🎉 capsule_unlocked / 👥 invited / ⏰ reminder
  - Unread: bg `#E6F1FB`, thin left border `#185FA5`
  - Read: bg transparent
  - Swipe-to-delete: red background "Xoá" action
- Empty state: illustration + "Chưa có thông báo nào"

**States:** `Empty` / `Has unread` / `All read`

**Dev note:** Tap notification → navigate tới CapsuleLockedScreen hoặc CapsuleDetailScreen tùy `status`. Update `isRead = true` khi tap.

---

### 16. SettingsScreen

**Frame:** 390 × 844 · **Nav:** Stack từ ProfileScreen

**Layout:**
- Header: back "←" + "Cài đặt" 18px
- ScrollView
- **Section "Thông báo"** (group label 11px uppercase):
  - MenuItem "Thông báo khi capsule mở" + Toggle
  - MenuItem "Nhắc nhở trước 1 ngày" + Toggle + Crown badge (Premium)
- **Section "Giao diện"**:
  - MenuItem "Giao diện tối" + Toggle
  - MenuItem "Ngôn ngữ" + value "Tiếng Việt" + chevron
- **Section "Tài khoản"**:
  - MenuItem "Đổi ảnh đại diện"
  - MenuItem "Đổi tên hiển thị"
  - MenuItem "Đổi mật khẩu"
- **Section "Pháp lý"**:
  - MenuItem "Điều khoản sử dụng"
  - MenuItem "Chính sách bảo mật"

**States:**
- `Free` — toggle Premium-locked grayed out + crown badge, tap → PremiumModal
- `Premium` — tất cả toggles active

**Dev note:** Toggle on = `#1D9E75`, off = `#D3D1C7`. Ngôn ngữ picker: modal bottom sheet.

---

### 17. InviteAcceptScreen

**Frame:** 390 × 844 · **Nav:** Stack từ Firebase Dynamic Link

**Layout:**
- Top padding 48px
- Card preview capsule: 358×160px, border-radius 16px, blur cover + tiêu đề + "Mở vào DD/MM/YYYY"
- Text "X đã mời bạn vào capsule này": 16px, center, margin top 20px
- Avatar + tên người mời: 48px circle + name 14px, center, margin top 12px
- Button "Tham gia": primary, full width, margin top 32px
- Button "Từ chối": text link, `#E24B4A`, center, margin top 12px
- **Nếu chưa login:** button đổi thành "Đăng nhập để tham gia"

**States:**
- `Chưa login` → redirect LoginScreen (lưu token trước)
- `Đã login, chưa join` — default state
- `Đã join rồi` — thông báo "Bạn đã là thành viên của capsule này"
- `Link expired` — thông báo lỗi

**Dev note:** Lưu invite token vào AsyncStorage trước khi redirect login. Sau login lấy token ra xử lý join. Capsule preview chỉ show title + ngày mở, KHÔNG show nội dung (bảo mật).

---

## Overlay / Modal Components

> Không phải màn hình riêng, nhưng cần design trong Figma

### PremiumModal
- Bottom sheet, height ~480px, drag to dismiss
- Header: close button "×" + heading "Nâng cấp Premium"
- Pricing card: 29.000đ/tháng hoặc 199.000đ/năm (highlighted)
- Feature list: ✓ Không giới hạn capsule / ✓ Video / ✓ Capsule nhóm / ✓ 500MB/capsule
- Button "Nâng cấp ngay": primary, full width
- Button "Dùng thử miễn phí 7 ngày": outlined (nếu có)
- Text nhỏ "Huỷ bất kỳ lúc nào" — 11px, `#888780`

### ConfirmModal
- Center modal, border-radius 16px, width 320px
- Heading + body text + 2 buttons (Cancel outlined + Confirm primary/danger)
- Dùng cho: Xác nhận tạo capsule, Đăng xuất, Xoá capsule

### ActionSheet (bottom)
- Slide up, handle bar top, safe area bottom
- Dùng cho: Chọn ảnh (Chụp / Thư viện / Huỷ), Capsule options (Chia sẻ / Xoá)

---

## Figma File Structure (gợi ý)

```
📁 Time Capsule App
├── 📄 Cover
├── 📄 Design System
│   ├── Colors
│   ├── Typography
│   ├── Icons
│   └── Spacing
├── 📄 Components
│   ├── Buttons
│   ├── Inputs
│   ├── Cards
│   ├── Navigation
│   └── Modals
├── 📄 Auth Flow
│   ├── SplashScreen
│   ├── OnboardingScreen (3 states)
│   ├── LoginScreen
│   └── RegisterScreen
├── 📄 Main App
│   ├── HomeScreen (4 states)
│   ├── ExploreScreen
│   └── ProfileScreen
├── 📄 Create Capsule
│   ├── Step 1
│   ├── Step 2
│   ├── Step 3
│   └── Preview
├── 📄 Capsule Screens
│   ├── LockedScreen
│   ├── OpenAnimation
│   └── DetailScreen
└── 📄 Utility
    ├── NotificationsScreen
    ├── SettingsScreen
    └── InviteAcceptScreen
```

---

*Plan version 1.0 — Time Capsule App · Figma Design Plan*  
*Dựa trên: Time Capsule App — Kế hoạch triển khai chi tiết v1.0*
