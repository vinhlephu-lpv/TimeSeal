# Kế hoạch tích hợp Premium Animation cho ứng dụng TimeSeal (Cập nhật dung lượng gói)

Bản kế hoạch này đã được cập nhật dựa trên quyết định nâng cấp dung lượng cuối cùng của bạn cho gói Pro:
1. **Gói Pro**: Hạn mức tối đa cho mỗi Capsule **500MB**, tổng lưu trữ tài khoản **5GB**.
2. **Gói Plus**: Giữ hạn mức **50MB** cho mỗi Capsule, tổng lưu trữ tài khoản **1.5GB**.
3. **Gói Free**: Bỏ chặn dung lượng theo từng Capsule, giữ tối đa 5 ảnh/capsule và giới hạn tổng lưu trữ tài khoản **50MB**.
4. **Gói Pro Max**: Hạn mức tối đa cho mỗi Capsule **1GB**, tổng lưu trữ tài khoản **20GB**, tối đa 10 video dưới 10 phút với giá **199.000đ/tháng**.

---

## 1. Cơ cấu Gói cước & Quản lý Dung lượng Thông minh (Mô hình SaaS Chuẩn)

Việc phân cấp thành gói **Plus** (29K), **Pro** (79K) và **Pro Max** (199K) là một chiến lược kinh doanh rõ ràng, giống với mô hình của Apple iCloud hay Google One. Nó tạo ra nấc thang giá trị cho người dùng và bảo vệ an toàn ngân sách Firebase của bạn.

| Tính năng / Giới hạn | Gói FREE (Miễn phí) | Gói PLUS (29K / tháng) | Gói PRO (79K / tháng) | Gói PRO MAX (199K / tháng) |
| :--- | :--- | :--- | :--- | :--- |
| **Số lượng Capsule** | Tối đa **5 capsule trọn đời** | **Không giới hạn** số lượng | **Không giới hạn** số lượng | **Không giới hạn** số lượng |
| **Giới hạn mỗi lần tạo** | Tối đa 5 ảnh, 0 video. | Tối đa **10 ảnh & 3 video** (video dưới 3 phút). | Tối đa **20 ảnh & 5 video** (video dưới 5 phút). | Tối đa **30 ảnh & 10 video** (video dưới 10 phút). |
| **Dung lượng tối đa/Capsule** | Không chặn theo từng capsule. | Tối đa **50MB** / capsule. | Tối đa **500MB** / capsule. | Tối đa **1GB** / capsule. |
| **Tổng dung lượng tài khoản** | Tối đa **50MB** trọn đời. | Tối đa **1.5GB** đám mây. | Tối đa **5GB** đám mây. | Tối đa **20GB** đám mây. |
| **Capsule nhóm & FCM nâng cao**| Không hỗ trợ. | Có hỗ trợ. | Có hỗ trợ. | Có hỗ trợ. |

*Lưu ý kỹ thuật về Nén Video trên Thiết bị di động (Client-side Compression)*:
*   **Gói Plus**: Một video 3 phút khi được nén ở chuẩn di động tối ưu sẽ nặng khoảng **35MB - 45MB**. Với tổng dung lượng capsule 50MB, người dùng hoàn toàn có thể upload 1 video 3 phút dài hoặc chia nhỏ thành 2-3 clip ngắn dưới 1 phút. Thiết bị sẽ tự động nén trước khi upload để bảo đảm không vượt quá hạn mức 50MB của capsule.
*   **Gói Pro**: Video 5 phút sau nén chỉ nặng khoảng **60MB - 75MB**. Với tổng hạn mức capsule nâng lên **500MB**, người dùng gói Pro có thể tải lên tới 5 video 5 phút và 20 hình ảnh chất lượng cao một cách cực kỳ thoải mái mà không gặp bất kỳ trở ngại nào về mặt bộ nhớ.

---

## 2. Chính sách Xử lý Tài khoản Hết hạn & Cơ chế Xoá Linh hoạt

Để bảo đảm tính nhân văn (giữ lại ký ức quý giá của khách hàng) nhưng vẫn thúc đẩy họ gia hạn gói cước, đồng thời bảo vệ người dùng khỏi những lỗi thao tác lỡ tay, chúng ta sẽ áp dụng các cơ chế xoá capsule cực kỳ linh hoạt sau:

### A. Khi hết hạn gói Plus / Pro (Downgrade về Free)
1.  **Ký ức được bảo toàn**: Toàn bộ capsule cũ (đã khoá hoặc đã mở) của người dùng **tuyệt đối không bị xoá**. Họ vẫn có thể truy cập app để xem lại các ký ức đã mở khoá hoặc chờ các capsule đang khoá đến ngày mở.
2.  **Khóa tính năng tạo mới**: Tài khoản sẽ tự động chuyển về trạng thái **Free**. Lúc này, vì số lượng capsule hiện tại hoặc tổng dung lượng lưu trữ của họ đã vượt quá giới hạn gói Free, nút "Tạo mới" sẽ bị khóa. 
3.  **Thông báo gia hạn tế nhị**: Khi người dùng bấm nút tạo mới, một pop-up đẹp mắt xuất hiện: *"Ký ức của bạn vẫn an toàn! Để tạo thêm các hộp thư thời gian mới, vui lòng gia hạn hoặc nâng cấp gói cước."*
4.  **Quyền xem nhân văn sau khi hết gói**: Với các capsule đã mở, người dùng hết hạn gói vẫn được **1 lượt xem và tải nội dung gốc miễn phí mỗi tháng**. Sau lượt này, app chỉ hiển thị metadata, ảnh thumbnail/preview nhẹ và nút gia hạn để mở lại quyền xem/tải chất lượng gốc. Cách này giữ sự tử tế với ký ức của khách hàng, nhưng vẫn bảo vệ TimeSeal khỏi chi phí download/egress phát sinh nếu người dùng xem video lớn liên tục sau khi không còn duy trì gói.
5.  **Gia hạn xuống gói thấp hơn thì áp dụng đúng quota gói mới**: Nếu người dùng từng dùng Pro Max nhưng sau khi hết hạn chỉ gia hạn Plus, app chỉ mở quyền xem/tải nội dung gốc trong phạm vi **1.5GB của gói Plus**. Phần dữ liệu vượt 1.5GB vẫn được giữ an toàn nhưng chỉ hiển thị preview nhẹ, không kế thừa ưu đãi dung lượng/xem không giới hạn của Pro Max. Khi dung lượng đã xem/tải full đạt 1.5GB trong phạm vi gói Plus, app dừng quyền full và mời người dùng nâng Pro/Pro Max hoặc xoá bớt dữ liệu để quay về trong quota.

**Mẫu thông báo khi hết gói và người dùng mở capsule đã mở:**

> Gói lưu trữ của bạn đã hết hạn, nhưng TimeSeal vẫn đang giữ an toàn những ký ức này cho bạn.
>
> Vì mỗi lần xem hoặc tải ảnh/video gốc đều phát sinh chi phí lưu trữ và truyền tải riêng, TimeSeal tặng bạn 1 lượt xem và tải đầy đủ mỗi tháng cho các capsule đã mở.
>
> Bạn có thể tranh thủ lưu lại những khoảnh khắc đẹp này về máy. Sau lượt miễn phí trong tháng, để tiếp tục xem hoặc tải nội dung chất lượng gốc, vui lòng gia hạn gói lưu trữ phù hợp.

**CTA đề xuất:**
- `Xem & tải lượt miễn phí`
- `Gia hạn để xem không giới hạn`
- `Để sau`

**Mẫu thông báo khi người dùng gia hạn gói thấp hơn dung lượng đang lưu:**

> Bạn đang lưu nhiều ký ức hơn giới hạn của gói Plus.
>
> Gói Plus hỗ trợ 1.5GB lưu trữ và xem/tải nội dung gốc trong phạm vi 1.5GB này. Những capsule vượt quá giới hạn vẫn được TimeSeal giữ an toàn, nhưng sẽ chỉ hiển thị bản xem trước nhẹ cho đến khi bạn nâng lên gói phù hợp hơn hoặc giải phóng bớt dung lượng.
>
> Nếu bạn muốn xem và tải lại toàn bộ ký ức chất lượng gốc như trước, bạn có thể chọn gói Pro hoặc Pro Max bất cứ lúc nào.

**CTA đề xuất cho trường hợp downgrade:**
- `Dùng trong giới hạn 1.5GB`
- `Nâng lên Pro/Pro Max`
- `Quản lý dung lượng`

### B. Quy tắc "Cho phép xoá Capsule sau 3 tháng đã mở"
*   Người dùng (cả Free và hết hạn gói) được phép **tự xoá** các Capsule **sau 3 tháng (90 ngày) kể từ ngày capsule đó được mở khoá thành công**.
*   Điều này giúp họ tải ảnh/video về máy điện thoại cá nhân cất giữ, rồi xoá bớt trên server để giải phóng dung lượng tài khoản cho mình, đồng thời giúp bạn giảm thiểu chi phí lưu trữ rác trên Firebase Storage.

### C. Quy tắc bảo vệ người dùng lỡ tay: "Cho phép xoá Capsule đang khoá nếu > 200MB"
*   **Cho phép xoá Capsule đang khoá** nếu tổng dung lượng của capsule đó **lớn hơn 200MB** (chỉ có thể xảy ra đối với tài khoản gói Pro hoặc tài khoản Plus lỡ upload file quá giới hạn nén). Người dùng có thể xoá đi để giải phóng bộ nhớ tài khoản tức thì và tạo lại cái mới tối ưu hơn.
*   **Giữ nguyên không cho xoá** đối với các Capsule đang khoá có dung lượng **dưới 200MB** đối với tài khoản Free/Plus để bảo vệ mô hình kinh doanh chống việc xoay vòng thẻ capsule liên tục.
*   *Trải nghiệm UX*: Khi người dùng muốn xoá capsule lớn hơn 200MB đang khoá, app hiển thị cảnh báo: *"Hộp thư thời gian này có dung lượng rất lớn (>200MB). Bạn có muốn xoá vĩnh viễn để giải phóng bộ nhớ tài khoản không?"*

---

## 3. Bản thiết kế Lễ Mở Khoá: "Két sắt Cổ kính chứa Thư Sáp nến" (C + A)

Đây là trải nghiệm cốt lõi mang lại cảm xúc vỡ oà cho người dùng.

```
[Màn hình tối lại] ──> [Két sắt đồng cổ hiện ra] ──> [Xoay ổ khoá] ──> [Cửa két mở ra] ──> [Thư sáp nến xuất hiện] ──> [Vỡ sáp & Mở thư]
```

*   **Thao tác chi tiết**:
    1.  Người dùng nhấn "Mở Capsule" từ Trang chủ. Màn hình tối dần (`Fade Out` danh sách và `Fade In` màn hình mở khoá màu đen huyền bí).
    2.  Một chiếc **Két sắt đồng thau cổ điển** với các họa tiết chạm khắc tinh xảo hiện ra ở trung tâm.
    3.  Người dùng dùng ngón tay **vuốt vòng tròn** để xoay ổ khoá mã số (Dial) theo chiều kim đồng hồ rồi ngược chiều kim đồng hồ. Ổ khóa xoay mượt mà theo ngón tay, phát ra âm thanh tách tách nhẹ (kèm haptic feedback rung phản hồi nhẹ).
    4.  Khi đúng mã, tay nắm két sắt tự động xoay ngang, cửa két từ từ hé mở, phát ra một luồng sáng ấm áp từ khe cửa.
    5.  Bên trong két sắt hiện ra một **cuộn thư bằng da/giấy da cổ kính được niêm phong bằng sáp nến đỏ** mang logo TimeSeal.
    6.  Người dùng **tap vào con dấu sáp**. Con dấu sáp nứt vỡ ra thành các mảnh nhỏ kèm hiệu ứng bụi sáng lấp lánh (sparkle particles), cuộn thư từ từ mở ra (unroll) toàn màn hình và chuyển tiếp mượt mà vào nội dung chi tiết.

---

## 4. Gợi ý Chi tiết các Điểm thêm Animation (Hành động & Thao tác)

Dưới đây là danh sách cụ thể các hành động tương tác của người dùng và hiệu ứng chuyển động tương ứng trong ứng dụng:

| Khu vực / Màn hình | Hành động của người dùng (Action/Gesture) | Hiệu ứng chuyển động (Animation Response) | Ý nghĩa UX |
| :--- | :--- | :--- | :--- |
| **Trang chủ (HomeScreen)** | **Vuốt xuống để tải lại** (Pull-to-refresh) | Thay vì spinner mặc định, một **chiếc đồng hồ cát cổ bằng vector** xuất hiện. Cát sẽ chảy từ nửa trên xuống nửa dưới theo nhịp tải dữ liệu, khi xong sẽ lật ngược lại và biến mất. | Tạo sự thú vị khi chờ đợi dữ liệu |
| | **Tap vào thẻ capsule** (Press & Release) | Khi ngón tay chạm vào thẻ, thẻ thu nhỏ nhẹ (`scale: 0.97`) và bóng đổ mờ đi. Khi nhấc tay ra, thẻ nẩy nhẹ lại (`scale: 1.0`) trước khi chuyển màn hình. | Tạo phản hồi vật lý chân thực khi chạm |
| | **Có thông báo mới** (Không thao tác - Bị động) | Biểu tượng chuông thông báo ở góc phải màn hình sẽ **rung lắc nhẹ (wobble shake)** 3 lần mỗi 5 giây để thu hút ánh nhìn nếu có capsule vừa mở. | Nhắc nhở người dùng tế nhị, không gây khó chịu |
| **Tạo Capsule (Step 1)** | **Chọn Ngày & Giờ cụ thể** (Open Date & Time Picker) | Hộp thoại chọn ngày giờ (mode `datetime`) trượt từ dưới lên (Slide-up Sheet) mượt mà. Khi chọn xong, ô hiển thị hiển thị chính xác ngày và giờ (ví dụ: `00:00 - 01/01/2027`) với hiệu ứng số cuộn lên. | Xác nhận thao tác chuyên nghiệp, chính xác |
| | **Tap chọn Chủ đề** (Theme Chip Selection) | Khi tap vào chip chủ đề, chip đó sẽ phồng to nhẹ rồi thu lại (pop effect). Đồng thời, **màu nền gradient của màn hình sẽ chuyển đổi mượt mà** (smooth color transition) sang màu của theme đó ngay tại chỗ để người dùng xem trước. | Tạo sự tương tác trực quan cao |
| **Tạo Capsule (Step 2)** | **Thêm ảnh mới** (Add Media) | Khi chọn xong ảnh từ thư viện, ô ảnh mới sẽ **phóng to từ điểm trung tâm** (scale từ 0 lên 1) kèm hiệu ứng xoay nhẹ 5 độ để xếp vào lưới ảnh. | Cảm giác ảnh được thả vào hộp ký ức |
| | **Xoá ảnh khỏi lưới** (Remove Media) | Khi bấm nút `X` trên góc ảnh, bức ảnh đó sẽ thu nhỏ dần về `0` (shrink to zero) và biến mất, các ảnh còn lại tự động trượt sang lấp chỗ trống mượt mà. | Phản hồi tức thì về việc xoá |
| **Xác nhận (Preview)** | **Bấm nút "Tạo & Khoá Capsule"** (Press Lock Button) | Nút bấm chuyển trạng thái thành vòng tròn tải lên. Khi upload hoàn tất, một **ổ khoá lớn màu vàng gold xuất hiện ở tâm màn hình và đóng sập lại** (phát ra âm thanh cạch nhẹ và hiệu ứng sóng rung tỏa ra xung quanh). Sau đó tự động trượt màn hình về Trang chủ. | Tạo sự yên tâm tuyệt đối rằng ký ức đã được khoá an toàn |
| **Đang chờ (Locked Screen)** | **Nhìn màn hình countdown** (Static view) | Ổ khoá trên màn hình nhấp nháy phát sáng nhẹ nhàng (glowing pulse) theo nhịp thở. Các con số đếm ngược **Ngày / Giờ / Phút / Giây** sẽ chạy liên tục và tự động cuộn lên (scroll up) mượt mà khi thay đổi mỗi giây thay vì thay đổi giật cục. | Trực quan hóa dòng chảy thời gian sinh động |
| **Chi tiết (Detail Screen)** | **Kéo xuống xem ảnh** (Scroll view) | Ảnh bìa lớn ở trên cùng sử dụng hiệu ứng **Parallax Stretch**: khi kéo danh sách xuống, ảnh bìa sẽ tự động giãn to ra để lấp khoảng trống. Khi buông tay, ảnh co lại bình thường. | Tạo chiều sâu không gian cao cấp |
| | **Xem album ảnh** (Tap to Lightbox) | Khi tap vào một bức ảnh trong lưới, bức ảnh đó sẽ bay và mở rộng dần từ vị trí cũ ra toàn màn hình (Shared Element Transition). Vuốt ảnh xuống dưới để thu nhỏ bay về chỗ cũ. | Trải nghiệm duyệt ảnh liền mạch, sang trọng |
| **Hồ sơ (Profile Screen)** | **Thay đổi ảnh đại diện** (Change Avatar) | Khi chọn ảnh đại diện mới và upload thành công, khung avatar hình tròn thực hiện hiệu ứng **Lật 3D (3D Flip)** dọc. Ở góc 90 độ, ảnh cũ đổi thành ảnh mới. Khi ảnh mới lật ra, một **dải sáng quét qua** (circular shimmer scan beam) chạy quanh viền ảnh từ trên xuống dưới. | Tăng tính công nghệ và độ phản hồi cao cấp của app |
| **Premium (Upsell Modal)** | **Mở bảng nâng cấp** (View Premium) | Vương miện vàng ở đỉnh bảng phát ra các hạt lấp lánh (sparkle particles) rơi nhẹ xung quanh. Thẻ giá gói khuyên dùng (Recommended) sẽ có một **dải sáng gradient chạy quanh viền** (border beam glow). | Kích thích thị giác, tăng tỷ lệ chuyển đổi |

---

## 5. Bộ sưu tập Chủ đề Giao diện (Theme Collection) Đa dạng

Khi chọn chủ đề ở Bước 1 tạo Capsule, màu sắc và họa tiết nền của thẻ sẽ thay đổi linh hoạt theo các phong cách sau:

1.  **Mặc định (Classic Midnight)**: Phong cách tối giản sâu thẳm, huyền bí với các chi tiết màu tím neon dịu mắt.
2.  **Sinh nhật (Birthday Celebration)**: Tông hồng pastel ngọt ngào, ấm áp kết hợp hoạt họa bóng bay rơi nhẹ nhàng.
3.  **Năm mới (Festive New Year)**: Tông đỏ nhung cổ điển kết hợp các hạt nhũ vàng kim rực rỡ tượng trưng cho sự may mắn.
4.  **Tốt nghiệp (Graduation Gold)**: Sự kết hợp sang trọng giữa đen huyền bí và vàng gold hoàng kim thể hiện sự thành tựu.
5.  **Hoài cổ (Vintage Journal)**: Tông màu giấy kraft ngả vàng, giả lập bề mặt da thuộc ấm áp, hoài niệm.
6.  **Tương lai (Neon Cyberpunk)**: Kết hợp các dải sáng xanh lam cyan và hồng magenta rực rỡ dành cho giới trẻ cá tính.

---

## 6. Giải pháp Tối ưu Hiệu năng (Reduce Motion)

Chúng tôi sẽ xây dựng tính năng **"Giảm chuyển động" (Reduce Motion)** trong Settings:
1.  **Khi bật Reduce Motion**:
    *   Tất cả các chuyển động phức tạp (xoay két sắt, pháo hoa giấy rơi, dải sáng chạy viền, các hiệu ứng spring co giãn mạnh) sẽ bị vô hiệu hóa.
    *   Thay thế bằng hiệu ứng **Fade In / Fade Out** đơn giản bằng CSS/Reanimated với thời gian chuyển tiếp cực ngắn (150ms).
    *   Lottie Animation sẽ hiển thị ở khung hình tĩnh (static frame) cuối cùng thay vì phát chuyển động liên tục.
2.  **Tối ưu phần cứng**: Chạy toàn bộ animation qua `useAnimatedStyle` để Reanimated can thiệp trực tiếp vào thuộc tính của View ở tầng Native (UI Thread), hoàn toàn độc lập với Javascript Thread (đảm bảo không bị nghẽn cổ chai khi app đang xử lý logic nặng).

---

## 7. Kế hoạch triển khai & Xác minh (Verification Plan)

### Các giai đoạn thực hiện:
*   **Giai đoạn 1**: Cấu hình các thư viện `react-native-reanimated` và `react-native-lottie`, thiết lập nền tảng và dựng **Splash Screen Intro** và **Onboarding Slider**.
*   **Giai đoạn 2**: Tạo hiệu ứng chạm nảy (**Card Press Feedback**), thu phóng của nút **FAB**, và bộ đếm ngược **Ngày/Giờ/Phút/Giây** thời gian thực kèm hiệu ứng cuộn số trên **Capsule Locked Screen**.
*   **Giai đoạn 3**: Triển khai Lễ mở khoá két sắt + thư sáp nến (Option C + A) kèm hiệu ứng pháo hoa giấy và chuyển tiếp màn hình. Triển khai hiệu ứng **Đổi ảnh đại diện (3D Flip + Shimmer scan)**.
*   **Giai đoạn 4**: Tối ưu hóa hiệu năng, xây dựng tính năng **Reduce Motion** và QA kiểm thử FPS.
