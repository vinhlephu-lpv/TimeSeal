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

--- Bổ sung rule vận hành quota ---

1. Quota trong TimeSeal nên hiểu đơn giản là "phần dung lượng mà tài khoản đã làm app phải lưu hoặc tải từ cloud". Nó không chỉ là dung lượng ảnh/video đang nằm trên server, mà còn bao gồm cả việc người dùng mở xem hoặc tải/lưu media nhiều lần trong suốt thời gian dùng account. Vì vậy app cần theo dõi 3 nhóm dung lượng khác nhau:
   - Dung lượng đang lưu thật trên cloud: ví dụ avatar hiện tại, ảnh/video của capsule, ảnh thumbnail/preview đã upload. Phần này còn nằm trên server thì còn chiếm quota.
   - Dung lượng đã xem hoặc tải của account: ví dụ người dùng mở ảnh/video full chất lượng, tải media về máy, hoặc app phải tải lại avatar từ cloud vì cache trên máy đã mất. Phần này là quota trọn đời gắn với account, không tự reset theo tháng. Khi account đã dùng quota để xem/tải dữ liệu từ cloud thì dung lượng đó vẫn được tính vào tổng quota đã dùng của account, trừ khi sau này app có rule riêng để cộng thêm quota, xoá bớt dữ liệu liên quan, hoặc nâng gói.
   - Dung lượng giữ chỗ tạm khi đang upload: ví dụ người dùng bắt đầu upload avatar hoặc media capsule nhưng chưa hoàn tất. App giữ chỗ trước để tránh upload xong mới phát hiện vượt quota. Nếu upload bị huỷ, thất bại, hoặc bỏ dở quá lâu thì phần giữ chỗ này phải được trả lại.

2. Upload hoặc đổi avatar cũng phải tính quota, vì avatar vẫn là file được lưu trên cloud. Cách đúng là app xin backend tạo chỗ upload trước, sau đó upload file, rồi backend kiểm tra lại kích thước thật sau khi upload xong. Nếu avatar mới hợp lệ thì quota được cập nhật theo avatar mới và avatar cũ được xoá đi. Nếu upload thất bại thì phần dung lượng giữ chỗ phải được giải phóng, không để user bị tính oan.

3. Load lại avatar khi mất cache cũng được tính cho người đang load avatar đó, vì lúc này app phải tải file từ cloud về lại thiết bị. Tuy nhiên avatar là thành phần nhỏ giúp UI hiển thị bình thường, nên không được siết quá mạnh đến mức làm vỡ màn hình hoặc mất avatar hàng loạt. Nếu có lỗi phụ khi tính quota avatar, app vẫn nên ưu tiên hiển thị ổn định.

4. Xem media và lưu/tải media là 2 hành động khác nhau. Khi người dùng mở capsule để xem ảnh/video full chất lượng thì tính một lượt xem. Nếu sau đó người dùng bấm lưu ảnh/video về máy thì tính thêm một lượt lưu/tải riêng. Lý do là cả hai lần đều có thể làm app tải dữ liệu từ cloud, và mỗi lần như vậy đều có thể tạo chi phí.

5. Khi người dùng bấm "Lưu tất cả", app chỉ nên tính quota cho những media thật sự được lưu. Nếu trong một capsule có 10 media nhưng chỉ 7 media còn đủ quota để lưu, thì 7 media đó vẫn được lưu bình thường, 3 media quá lớn thì bị bỏ qua hoặc báo không lưu được. Không nên chặn toàn bộ capsule chỉ vì một video quá nặng.

6. Với capsule cá nhân hoặc capsule nhóm đã mở, quota nên được tính theo từng media nếu có thể. Ví dụ một video 900MB có thể vượt quota còn lại, nhưng vài ảnh nhỏ 2MB vẫn còn đủ quota thì user vẫn được xem/lưu các ảnh nhỏ đó. Rule này giúp app không bị quá cứng và không làm user thấy app "khóa hết" một cách khó chịu.

7. Với capsule nhóm đang chờ đóng góp, có 2 mức xem khác nhau. Mức xem preview chung chỉ tính phần preview/thumbnail nhẹ để người dùng biết capsule có gì. Khi người dùng bấm vào chi tiết của một thành viên cụ thể, lúc đó mới tính quota theo media của thành viên đó. Không tính toàn bộ media của cả nhóm nếu người dùng chỉ mở xem một người.

8. Cache local là file đã có sẵn trong máy người dùng, nên không tính quota lại. Ví dụ ảnh thumbnail hoặc avatar đã tải về máy rồi thì lần sau app lấy từ cache sẽ không tốn cloud nữa. Chỉ khi cache bị mất, cache cũ không dùng được, URL hết hạn, hoặc người dùng chủ động xem/lưu lại từ cloud thì mới tính quota.

9. Người xem, người tải, người lưu, người upload, người đóng góp là ai thì quota tính cho người đó. Không cộng dồn mọi chi phí về chủ capsule. Ví dụ user A tạo capsule nhóm, user B đóng góp video, user C mở xem video đó; phần upload video tính cho B, phần xem video tính cho C, không tự động dồn hết cho A.

10. Khi xoá account, phải dọn các dữ liệu dính với account đó để tránh còn file rác trên cloud hoặc dữ liệu mồ côi trong database. Những thứ cần dọn gồm: thông tin user, Firebase Auth user, avatar, upload draft chưa xong, capsule do user sở hữu, contribution user từng gửi vào capsule người khác, invite, notification, storage item, và các file contribution liên quan. Nếu xoá capsule của user làm mất dữ liệu do người khác từng đóng góp vào capsule đó, quota lưu trữ của người đóng góp cũng phải được trừ lại cho đúng.

11. Các rule quota này dùng để giảm thất thoát chi phí cloud, không phải để biến app thành hệ thống chống hack quá gắt. Khi phải chọn giữa "tính cực kỳ chặt nhưng dễ làm app lỗi" và "tính đủ các luồng chính nhưng app ổn định", TimeSeal ưu tiên cách thứ hai. Những phần tốn phí lớn như media full chất lượng, download, upload capsule, upload avatar phải tính rõ; những phần phụ nhỏ như avatar hoặc preview nên tính nhẹ tay để không làm hỏng trải nghiệm.
