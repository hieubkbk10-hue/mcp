# Hieu Local MCP Suite & Satek Universal Architecture Linter

Hệ thống MCP Server toàn diện chạy cục bộ (Local), cung cấp các công cụ tiện ích hệ thống, cỗ máy tự động hóa sản xuất nội dung YouTube triệu view và bộ **Linter v3 + i18n Checker** độc quyền cho dự án **Satek-Client-FE** (tích hợp trực tiếp từ [satek-lint](https://github.com/hieubkbk10-hue/satek-lint)).

---

## 🛠️ Danh mục 15 Tools trong 2 Servers

### 🛡️ Server 1: `satek-lint` (Chuyên trách Audit & Quy chuẩn dự án Satek)
*Chạy từ:* `src/satek-lint-server.ts`
1. **`satek_audit_file`** 👑 *(Trùm cuối)*: Chạy toàn diện **5 Trụ Cột** (Formik + Yup, SSOT Hằng số, RTK Query Cache, TypeScript & Imports, UI Tokens & i18n), chấm điểm tuân thủ (0-100/100).
2. **`satek_audit_folder`**: Quét toàn bộ thư mục bằng Satek Linter v3 AST Engine, tính tỷ lệ tuân thủ (%) và lọc danh sách vi phạm.
3. **`satek_list_rules`**: Tra cứu danh mục hơn 50 quy chuẩn kiến trúc và coding theo 17 nhóm.
4. **`satek_i18n_lint_file`**: Soi sâu lỗi đa ngôn ngữ: bắt tiếng Việt hardcode, ép `English-as-Identifier`, cấm nối chuỗi với `trans()`, tự động phát hiện thiếu bản dịch và sinh code bổ sung từ điển.
5. **`satek_i18n_scan_folder`**: Quét lỗi i18n hàng loạt trên toàn thư mục.
6. **`satek_i18n_check_duplicate_keys`**: Soi trùng lặp key trong các file từ điển `src/locales/vi/*.ts` (ngăn chặn triệt để lỗi TypeScript `TS1117`).

### ⚡ Server 2: `hieu-local` (YouTube Creator & Tiện ích Desktop)
*Chạy từ:* `src/index.ts`
7. **`youtube_search`** 🔍: Tìm kiếm video trên YouTube theo từ khóa (kèm lượt xem, ngày đăng, thời lượng, kênh) — 100% Free, không cần API key.
8. **`get_youtube_transcript`** 🎬: Bóc tách toàn bộ phụ đề / kịch bản lời thoại video YouTube từ đường link URL trong 0.5s (không cần tải video về).
9. **`get_youtube_comments`** 💬: Cào bình luận (comments) nhiều like nhất hoặc mới nhất của video để nghiên cứu tâm lý khán giả và lấy ý tưởng nội dung.
10. **`get_youtube_thumbnail`** 🖼️: Lấy ảnh bìa Thumbnail độ phân giải cao nhất (Full HD / 4K / maxresdefault), hỗ trợ tải trực tiếp về máy tính.
11. **`notify_windows`** 🔔: Bắn thông báo Windows Toast Notification kèm âm thanh chuông và 10 avatar biểu cảm hài hước (`party`, `zany`, `cat`, `fire`, `coffee`...).
12. **`play_chime`** 🎵: Phát âm thanh chuông báo (Ting / Chime) trực tiếp trên loa máy tính.
13. **`get_current_time`**: Lấy ngày giờ thực tế hiện tại của hệ thống (Asia/Ho_Chi_Minh).
14. **`get_system_info`**: Lấy thông tin cấu hình phần cứng: Tên máy, OS, CPU, RAM đang dùng/còn trống, thời gian máy bật (uptime).
15. **`calculate`**: Thực hiện phép tính toán cơ bản (+, -, *, /) với 2 số.

---

## 🚀 Cách cài đặt & Chạy thử nghiệm

### 1. Cài đặt thư viện
```bash
cd D:\Hieubkav\MCP
bun install
pip install youtube-comment-downloader
```

### 2. Kiểm thử bằng MCP Inspector
```bash
bun run inspector
```
Trình duyệt sẽ mở giao diện Web GUI để bạn test trực quan từng tool.

---

## ⚙️ Cấu hình vào Client AI (Claude Desktop, Cursor, Droid)

### Factory Droid
Các server đã được cấu hình sẵn trong `.factory/mcp.json`. Bạn chỉ cần chạy:
```bash
droid mcp add hieu-local "bun run D:/Hieubkav/MCP/src/index.ts" --type stdio
droid mcp add satek-lint "bun run D:/Hieubkav/MCP/src/satek-lint-server.ts" --type stdio
droid mcp add memory "npx -y @modelcontextprotocol/server-memory" --type stdio
```

### Claude Desktop
File `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "hieu-local": {
      "command": "bun",
      "args": ["run", "D:/Hieubkav/MCP/src/index.ts"]
    },
    "satek-lint": {
      "command": "bun",
      "args": ["run", "D:/Hieubkav/MCP/src/satek-lint-server.ts"]
    }
  }
}
```

### Cursor
Vào **Settings** -> **Features** -> **MCP Servers** -> **Add New MCP Server**:
* **hieu-local:** `bun run D:/Hieubkav/MCP/src/index.ts`
* **satek-lint:** `bun run D:/Hieubkav/MCP/src/satek-lint-server.ts`
