# Hieu Local MCP Server

MCP Server chạy local để kết nối các tool hệ thống với các AI Client (Claude Desktop, Cursor, Roo Code, Continue,...).

---

## Các Tool được tích hợp sẵn

1. **`get_current_time`**: Lấy ngày giờ thực tế hiện tại của hệ thống (theo múi giờ Asia/Ho_Chi_Minh).
2. **`get_system_info`**: Lấy thông tin cấu hình phần cứng: Tên máy, OS, CPU, RAM đang dùng/còn trống, thời gian máy bật (uptime).
3. **`calculate`**: Thực hiện phép tính toán cơ bản (+, -, *, /) với 2 số.

---

## Cách cài đặt & Chạy thử nghiệm

### 1. Cài đặt thư viện
```bash
cd D:\Hieubkav\MCP
bun install
```
*(hoặc dùng `npm install` nếu muốn)*

### 2. Kiểm thử bằng MCP Inspector
```bash
bun run inspector
```
Trình duyệt sẽ mở giao diện Web GUI để bạn test trực quan từng tool.

---

## Cấu hình vào Claude Desktop

Mở file:
`%APPDATA%\Claude\claude_desktop_config.json`
*(hoặc `C:\Users\<Tên_User>\AppData\Roaming\Claude\claude_desktop_config.json`)*

Thêm cấu hình:

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

*Nếu muốn chạy bằng Node.js thay vì Bun:*
```json
{
  "mcpServers": {
    "hieu-local": {
      "command": "npx",
      "args": ["-y", "tsx", "D:/Hieubkav/MCP/src/index.ts"]
    }
  }
}
```

---

## Cấu hình vào Cursor

Vào **Settings** -> **Features** -> **MCP Servers** -> **Add New MCP Server**:
* **Name:** `hieu-local`
* **Type:** `command`
* **Command:** `bun run D:/Hieubkav/MCP/src/index.ts`
