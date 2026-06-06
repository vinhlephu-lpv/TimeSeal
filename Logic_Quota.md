File này chứa 1 số logic quy tắc bắt buộc về cách tính quota trong app:
1. Quota của users Free là 50MB/ 1 account, nếu vượt quá sẽ không thể upload, xem, tải xuống media capsule. 
2. Quota của users Plus là 1.5GB/ 1 account, nếu vượt quá sẽ không thể upload, xem, tải xuống media capsule.
3. Quota của users Pro là 5GB/ 1 account, nếu vượt quá sẽ không thể upload, xem, tải xuống media capsule.
4. Quota của users Pro Max là 20GB/ 1 account, nếu vượt quá sẽ không thể upload, xem, tải xuống media capsule.

Các trường hợp bị tính quota bao gồm:
1. Upload/ đổi avatar.
2. Load lại avatar khi mất cache version cũ.
3. Upload media khi tạo capsule cá nhân hoặc nhóm đã hoàn thành.
4. Xem capsule đã mở (tính theo dung lượng của media capsule đó).
5. Tải xuống media capsule (tính theo dung lượng của media capsule đó, bao gồm việc tải xuống tất cả hoặc tải từng ảnh fullscreens). Việc load media capsule và xem full screen như mục 4 là 1, khi bấm lưu media thì mới tính là trường hợp khác.
6. Load thumbnails của media capsule ngoài "Trang chủ" (bao gồm capsule cá nhân và capsule nhóm).
7. Load ảnh bìa preview của capsule (bao gồm capsule cá nhân và capsule nhóm).
8. Load full chất lượng khi bấm vào xem chi tiết của capsule nhóm hoặc mở xem capsule cá nhân (giống mục 4, 5).
9. Xem capsule đang chờ đóng góp (xem preview chung thì tính quota theo preview, "bấm vào để xem chi tiết của users đóng góp nào thì tính quota theo dung lượng media của users đóng góp đó). 
10. Xem capsule nhóm (đóng góp) đã mở (bấm vào xem thì load full dung lượng như mục 8, nếu quota hết hoặc vượt quá giới hạn quota của account thì không thể xem được media QUÁ LỚN ĐÓ, ví dụ như video nặng, nhưng vẫn có thể xem, load, lưu được các media ví dụ như ảnh về vì nó chưa vượt quá quota của account, không cấm lưu).
11. Đóng góp vào capsule nhóm (tính từ vị trí của thành viên được mời, thay đổi đóng góp thì tính toán thông minh theo media đã sửa, xoá đi thì không tính, không bắt upload lại từd dầu).
12. ...

Các quy tắc bất chi bất dịch: 
1. Ai xem cái gì (ví dụ xem full chất lượng media), load cái gì (ví dụ thumbnails, ảnh bìa, preview), tải xuống (lưu) cái gì, đóng góp cái gì, tải lên cái gì thì người đó sẽ được tính quota theo các trường hợp trên, không dồn quota cho người tạo capsule.
2. Capsule được chia sẽ cũng kệ, ai xem thì tính quota cho người đó.
3. Xem, tải, lưu, đóng góp,... bao nhiêu lần thì tính bao nhiêu lần khác nhau.
4. Không tính quota ở màn hình capsule đang khoá (chỉ tính cái avt được load trong đó, ví dụ: tạo bởi users, ở đó có hiện 1 thumbanails nhỏ cho avt, tính quota cái đó thôi).

Thất thoát quota là không cho phép, tránh tôi bị mất tiền oan. Nhưng đặt biệt lưu ý không siết rule tránh làm những hoạt động hiện tại trong bị đảo lộn.

Xoá account thì toàn bộ dữ liệu dính với account đó sẽ được xoá hết khỏi database.
