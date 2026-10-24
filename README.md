# Hieu Local MCP Server & Satek Universal Architecture Linter

MCP Server chạy local cung cấp các tool tiện ích hệ thống và bộ **Linter v3 + i18n Checker** độc quyền dành cho dự án **Satek-Client-FE** (tích hợp trực tiếp engine từ [satek-lint](https://github.com/hieubkbk10-hue/satek-lint)).

---

## 🛠️ Danh mục 9 Tools tích hợp sẵn

### A. Nhóm Satek Architecture & 5-Pillar Audit Gate
1. **`satek_audit_file`** 👑 *(Trùm cuối)*:
   * Chạy toàn diện **5 Trụ Cột** (Formik + Yup, SSOT Hằng số, RTK Query Cache, TypeScript & Imports, UI Tokens & i18n) cho 1 file component.
   * Chấm điểm tuân thủ (0-100/100) và xuất bảng báo cáo Markdown trực quan.
2. **`satek_audit_folder`**:
   * Quét toàn bộ thư mục bằng Satek Linter v3 AST Engine (phân tích AST, Imports, RTK Query, Design Tokens).
   * Thống kê tỷ lệ tuân thủ (Compliance Rate %), số tệp sạch và danh sách vi phạm.
3. **`satek_list_rules`**:
   * Tra cứu danh mục hơn 50 quy chuẩn kiến trúc và coding của Satek theo 17 nhóm.
4. **`satek_i18n_lint_file`**:
   * Soi chuyên sâu đa ngôn ngữ: Bắt tiếng Việt hardcode trong JSX/props, ép chuẩn `English-as-Identifier`, cấm nối chuỗi với `trans()`, tự động phát hiện thiếu bản dịch và sinh code gợi ý cho `src/locales/vi/{domain}.ts`.
5. **`satek_i18n_scan_folder`**:
   * Quét lỗi i18n trên diện rộng toàn thư mục.
6. **`satek_i18n_check_duplicate_keys`**:
   * Soi trùng lặp key trong các file từ điển `src/locales/vi/*.ts` (ngăn chặn triệt để lỗi TypeScript `TS1117`).

### B. Nhóm Tiện ích Hệ thống & Thông báo Desktop
7. **`notify_windows`** 🔔: Bắn thông báo Windows Toast Notification kèm âm thanh chuông khi AI hoàn thành task hoặc cần gọi bạn quay lại xem kết quả.
8. **`play_chime`** 🎵: Phát âm thanh chuông báo (Ting / Chime) trực tiếp trên loa máy tính.
9. **`get_current_time`**: Lấy ngày giờ thực tế hiện tại của hệ thống (Asia/Ho_Chi_Minh).
10. **`get_system_info`**: Lấy thông tin cấu hình phần cứng: Tên máy, OS, CPU, RAM đang dùng/còn trống, thời gian máy bật (uptime).
11. **`calculate`**: Thực hiện phép tính toán cơ bản (+, -, *, /) với 2 số.

---

## Cách cài đặt & Chạy thử nghiệm

### 1. Cài đặt thư viện
```bash
cd D:\Hieubkav\MCP
bun install
```

### 2. Kiểm thử bằng MCP Inspector
```bash
bun run inspector
```
Trình duyệt sẽ mở giao diện Web GUI để bạn test trực quan từng tool.

---

## Cấu hình vào Client AI

### Claude Desktop
File `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "hieu-local": {
      "command": "bun",
      "args": ["run", "D:/Hieubkav/MCP/src/index.ts"]
    }
  }
}
```

### Cursor
Vào **Settings** -> **Features** -> **MCP Servers** -> **Add New MCP Server**:
* **Name:** `hieu-local`
* **Type:** `command`
* **Command:** `bun run D:/Hieubkav/MCP/src/index.ts`

### Factory Droid
```bash
droid mcp add hieu-local "bun run D:/Hieubkav/MCP/src/index.ts" --type stdio
```
