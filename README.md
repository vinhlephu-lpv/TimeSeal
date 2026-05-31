# ⏳ TimeSeal - Ứng Dụng Hộp Ký Ức Kỹ Thuật Số (Digital Time Capsule)

> **TimeSeal** là ứng dụng di động viết bằng **React Native** giúp người dùng cất giữ những thông điệp, hình ảnh và video ý nghĩa bên trong những chiếc "Hộp ký ức" kỹ thuật số. Hộp ký ức sẽ được khóa chặt và chỉ tự động mở ra đúng vào một ngày hẹn cụ thể trong tương lai làm món quà bất ngờ cho chính bạn hoặc bạn bè.

---

## 🎨 1. Hình Tượng Nghệ Thuật Chủ Đạo (Brand Metaphor)
Ứng dụng được thiết kế theo văn phong hoài niệm nghệ thuật kết hợp công nghệ hiện đại. Giao diện xoay quanh hình tượng chủ đạo:
* **Cuộn thư tay cổ điển & Phong bì (`💌`):** Nơi cất giữ những lời nhắn viết cho tương lai.
* **Con dấu sáp niêm phong (Wax Seal):** Biểu tượng của sự bảo mật tuyệt đối, một khi đã đóng dấu khóa lại thì không thể mở ra sớm hơn thời hạn.
* **Đồng hồ đếm ngược cổ điển:** Hiển thị thời gian chờ mở hộp sinh động từng giây.

---

## 🚀 2. Các Tính Năng Chính Của Ứng Dụng (Core Features)

### 1. Khởi Tạo Hộp Ký Ức (Capsule Creation Flow)
Quy trình tạo hộp ký ức trải qua 4 bước trực quan, mượt mà:
* **Bước 1:** Đặt tiêu đề và chọn ngày giờ mở hộp trong tương lai (DatePicker trực quan).
* **Bước 2:** Chọn chủ đề thiết kế (Artistic Themes) đồng bộ.
* **Bước 3:** Viết thư tay (lời nhắn) gửi gắm tương lai và đính kèm tệp tin đa phương tiện (ảnh, video).
* **Bước 4:** Mời bạn bè, người thân tham gia đóng góp thông qua email (hộp ký ức nhóm).

### 2. Hệ Thống Chủ Đề Nghệ Thuật Đồng Bộ (Artistic Themes System)
Giao diện ứng dụng tự động thay đổi màu sắc, hình nền động, hoa văn vẽ tay và biểu tượng tương ứng theo theme người dùng chọn:
* **Mặc định (`🎨` - default):** Tối giản, thanh lịch.
* **Hoài niệm (`⏳` - vintage):** Khung ảnh cổ kính, hoa văn giấy da.
* **Tương Lai (`⚡` - cyberpunk / future):** Đường lưới neon, giao diện hologram hiện đại.
* **Cực Quang (`🌌` - aurora):** Bầu trời sao lấp lánh và các dải sáng cực quang huyền ảo.
* **Tĩnh lặng (`🍃` - zen):** Giao diện thư thái, vòng nước thiền tông và sỏi đá.
* **Hoàng hôn (`🌅` - sunset):** Gam màu đỏ cam lãng mạn của mặt trời lặn.
* **Hoàng gia (`👑` - royal - Premium):** Đường viền mạ vàng vương giả, sang trọng.
* **Pha lê (`💎` - crystal - Premium):** Các lăng kính phản chiếu lấp lánh đa sắc.
* **Sao Băng (`☄️` - starry - Premium):** Vệt sao băng chuyển động trên nền trời đêm.
* **Sinh nhật / Năm mới / Tốt nghiệp:** Các theme chuyên dụng cho sự kiện đặc biệt.

### 3. Bảo Mật Sinh Trắc Học Cao Cấp (Biometric Security)
* Kích hoạt xác thực Face ID hoặc Vân tay thông qua cảm biến phần cứng của thiết bị trước khi mở ứng dụng.
* **Thời gian tự động khóa (Lock Delay / Grace Period):** Cho phép người dùng tùy chọn thời gian chờ khóa ứng dụng khi chạy nền (Ngay lập tức, 15 giây, 1 phút, 5 phút, 15 phút) giúp tránh việc phải quét vân tay liên tục khi chuyển app ngắn hạn.

### 4. Quản Lý Dung Lượng Thông Minh (Storage & Bandwidth Management)
* Biểu đồ phần trăm dung lượng đã dùng trực quan.
* Liệt kê danh sách các hộp ký ức xếp theo thứ tự dung lượng tải xuống thực tế giúp người dùng dễ dàng quản lý.
* Cơ chế tự động **nén ảnh và video** thông minh trước khi tải lên để tiết kiệm dung lượng lưu trữ đám mây.
* Hộp ký ức đang khóa dưới 200MB hoặc đã mở dưới 3 tháng sẽ được bảo vệ nghiêm ngặt không cho phép xóa, đảm bảo tính toàn vẹn của ký ức.

### 5. Hệ Thống Thông Báo Đẩy Tự Động (Push Notifications)
* Thiết lập Cloud Functions chạy tự động lúc **7:00 sáng hàng ngày (Giờ VN)** để quét các hộp ký ức đến hạn mở.
* Hệ thống sẽ tự động cập nhật trạng thái hộp thành `unlocked` và bắn thông báo đẩy FCM kèm theo mã định danh `capsuleId` ẩn.
* **Killed/Background App:** Hệ điều hành hiển thị thanh thông báo hệ thống. Khi người dùng chạm vào, ứng dụng tự động mở từ đầu và điều hướng đi thẳng vào màn hình mở khóa hộp ký ức.
* **Foreground (In-App):** Lắng nghe sự kiện ngầm, cập nhật chấm đỏ thông báo và danh sách thông báo hộp thư trong ứng dụng theo thời gian thực mà không làm phiền người dùng.

### 6. Nâng Cấp Gói Premium (RevenueCat Monetization)
* Tích hợp cổng thanh toán RevenueCat để người dùng nâng cấp tài khoản lên gói **PLUS, PRO, PRO MAX**.
* Giúp mở rộng giới hạn số lượng hộp ký ức, số lượng ảnh/video đính kèm, thời lượng video, dung lượng tài khoản đám mây và mở khóa toàn bộ kho giao diện chủ đề cao cấp.

---

## 🛠️ 3. Công Nghệ & Kiến Trúc Dự Án (Tech Stack)
* **Frontend:** React Native (TypeScript), React Navigation (Điều hướng màn hình), Zustand (Quản lý trạng thái gọn nhẹ), React Native Reanimated (Hiệu ứng động mượt mà), React Native Vector Icons (Bộ thư viện Ionicons cao cấp).
* **Backend:** Firebase Authentication (Đăng nhập Email/Google), Cloud Firestore (Cơ sở dữ liệu thời gian thực), Cloud Storage (Lưu trữ tệp đa phương tiện), Cloud Functions (Lập lịch gửi thông báo đẩy ngầm).
* **Monetization:** RevenueCat (Hỗ trợ In-App Purchases).

---

## 📈 4. Tiến Độ Hiện Tại Của Dự Án (Current Status)

Dự án đã hoàn thành **Giai đoạn 1** và đạt trạng thái vô cùng chỉn chu, sẵn sàng phân phối:
* **Hệ thống xác thực:** Hoạt động hoàn hảo (Đăng nhập Email/Google, xác thực vân tay sinh trắc học và Grace Period hoạt động mượt mà).
* **Quy trình cất giữ ký ức:** Đã hoàn thiện toàn bộ luồng tạo hộp ký ức 4 bước, nén tệp tự động, hiển thị lưới ảnh collage nghệ thuật trên UI, và mở khóa countdown từng giây.
* **Thanh toán & Phân quyền:** Đồng bộ hóa quyền lợi gói PLUS/PRO/PRO MAX với RevenueCat. Hệ thống tự động giới hạn dung lượng tải lên/tải xuống và quyền truy cập xem ảnh chất lượng gốc theo gói cước của người dùng.
* **Đồng bộ hóa giao diện Icon:** Đã chuyển đổi thành công 100% các biểu tượng emoji/pictograph thô ban đầu sang các biểu tượng vector `<AppIcon />` (Ionicons) đồng bộ, đẳng cấp và sang trọng.
* **Bản địa hóa 100% (Localization):** Hệ thống song ngữ Anh - Việt được hoàn thiện triệt để. Tất cả các chuỗi thông báo lỗi nghiệp vụ từ store ngầm hay các hộp thoại Alert.alert hệ thống đều tự động dịch đổi ngôn ngữ hoàn hảo khi người dùng chọn Tiếng Anh.

---

## 💻 5. Hướng Dẫn Chạy Dự Án (Quick Start)

### Yêu cầu hệ thống:
* Đã cài đặt Node.js (phiên bản `>= 22.11.0` khuyên dùng).
* Đã thiết lập môi trường phát triển Android SDK/Xcode.

### Bước 1: Khởi động Metro Bundler
```sh
npm start
```

### Bước 2: Chạy ứng dụng trên thiết bị/giả lập
* **Android:**
  ```sh
  npm run android
  ```
* **iOS:**
  ```sh
  cd ios && pod install
  cd ..
  npm run ios
  ```
