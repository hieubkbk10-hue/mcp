# AI AGENT GUIDELINES & MCP CAPABILITY MANIFEST

> Tài liệu hướng dẫn hành vi, quy trình tác chiến và tiêu chuẩn sử dụng các công cụ MCP dành cho mọi AI Agent (Droid, Claude, Cursor, Roo Code...).

---

## 🧭 1. TỔNG QUAN HỆ THỐNG MCP (3 CLUSTERS)

Toàn bộ hệ thống được chia thành 3 máy chủ MCP chuyên trách:

1. **`hieu-local`**: Trung tâm tiện ích hệ thống, chuông thông báo desktop, và cỗ máy tự động hóa sản xuất nội dung YouTube.
2. **`satek-lint`**: Bộ máy phân tích tĩnh AST Linter v3 và kiểm soát chất lượng 5 Trụ Cột độc quyền cho dự án Satek-Client-FE.
3. **`memory`**: Trí nhớ dài hạn Knowledge Graph lưu trữ ngữ cảnh nhà phát triển và kiến trúc dự án.

---

## 🎬 2. QUY TRÌNH SẢN XUẤT NỘI DUNG YOUTUBE (PIPELINE)

Mọi AI Agent khi nhận yêu cầu làm nội dung YouTube bắt buộc phối hợp 4 công cụ theo chu trình sau:

```
[1. Bắt Trend]       youtube_search         --> Tìm video top view / nhiều like theo từ khóa
[2. Bóc Kịch Bản]    get_youtube_transcript --> Lấy 100% transcript kèm timestamps trong 0.5s
[3. Đào Tâm Lý]      get_youtube_comments   --> Phân tích comment xem khán giả khen/chê/thắc mắc gì
[4. Soi Thumbnail]   get_youtube_thumbnail  --> Lấy ảnh bìa MaxRes 1080p để học hỏi bố cục/màu sắc
[5. Xuất Xưởng]      AI Agent               --> Viết lại kịch bản Shorts 60s hoặc video dài
```

### Tiêu chuẩn thực thi:
* **Không tải video:** Tuyệt đối không yêu cầu người dùng tải file video về máy; chỉ sử dụng URL YouTube.
* **Tối ưu SEO:** Khi viết kịch bản hoàn chỉnh, AI Agent phải tự sinh kèm:
  - 3 Tiêu đề giật tít (Hook) theo công thức tò mò.
  - Đoạn mô tả chuẩn SEO có chèn mốc thời gian (Timestamps).
  - Danh sách 15 thẻ tags YouTube liên quan.
  - Gợi ý prompt chi tiết để vẽ Thumbnail bằng Midjourney / Flux.

---

## 🛡️ 3. QUY TRÌNH AUDIT 5 TRỤ CỘT CHO DỰ ÁN SATEK

Khi AI Agent thực hiện viết mã hoặc sửa đổi bất kỳ component/page nào trong `Satek-Client-FE`:

### Bước kiểm tra bắt buộc (Verification Gate):
1. **Trước khi báo hoàn thành:** Bắt buộc gọi MCP `satek_audit_file({ filePath })`.
2. **Tiêu chí nghiệm thu:**
   - Điểm tuân thủ đạt **từ 90/100 trở lên**.
   - 0 lỗi `CRITICAL` và 0 lỗi `HIGH`.
3. **5 Trụ Cột phân tích:**
   - 🔴 **Trụ cột 1:** 100% Formik + Yup, không `useState` rời rạc cho form nghiệp vụ.
   - 🔴 **Trụ cột 2:** Không hardcode format ngày (`DATE_FORMAT_API`), hằng số phải import từ `@/constants`.
   - 🔴 **Trụ cột 3:** RTK Query phải có đầy đủ `providesTags` và `invalidatesTags: [{ type, id: 'LIST' }]`.
   - 🟡 **Trụ cột 4:** Cấm import tương đối nhiều tầng `../../`, cấm `any`, tuân thủ barrel export `@/`.
   - 🟢 **Trụ cột 5:** Triệt tiêu 100% mã màu hex `#...`, bo góc theo 4 token, 100% key i18n bằng tiếng Anh (`English-as-Identifier`).

---

## 🔔 4. QUY CHUẨN THÔNG BÁO DESKTOP (`notify_windows`)

Sau khi hoàn thành các tác vụ kéo dài (quét audit toàn thư mục, phân tích video dài, refactor code lớn):

AI Agent **phải tự động gọi tool `notify_windows`** để báo hiệu cho người dùng với avatar phù hợp:
* `party` 🥳: Khi hoàn thành xuất sắc task lớn, pass 100% test hoặc đạt 100/100 điểm audit.
* `fire` 🔥: Khi tối ưu code chạy siêu nhanh hoặc hoàn thành kịch bản viral.
* `cat` 🐱: Khi dựng xong giao diện UI đẹp mắt.
* `coffee` ☕: Khi hoàn thành xong các tác vụ nền, mời người dùng quay lại review.
* `zany` 🤪: Khi vừa vá xong một bug ngớ ngẩn hoặc hài hước.
