import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import os from "node:os";

// 1. Khởi tạo MCP Server
const server = new McpServer({
  name: "hieu-local-mcp",
  version: "1.0.0",
});

// Tool 1: Lấy thời gian thực tế hiện tại
server.tool(
  "get_current_time",
  "Lấy ngày giờ thực tế hiện tại của hệ thống. Dùng khi người dùng hỏi thời gian, ngày tháng năm hiện tại.",
  {
    timeZone: z
      .string()
      .optional()
      .describe("Múi giờ cần xem, mặc định là Asia/Ho_Chi_Minh (Việt Nam)"),
  },
  async ({ timeZone = "Asia/Ho_Chi_Minh" }) => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone,
    }).format(now);

    return {
      content: [
        {
          type: "text",
          text: `Thời gian hiện tại (${timeZone}): ${formatted} (ISO: ${now.toISOString()})`,
        },
      ],
    };
  }
);

// Tool 2: Lấy thông tin cấu hình và trạng thái máy tính
server.tool(
  "get_system_info",
  "Lấy thông tin cấu hình máy tính hiện tại: Hệ điều hành, CPU, RAM sử dụng và thời gian máy đã bật (uptime).",
  {},
  async () => {
    const totalMemGB = (os.totalmem() / 1024 ** 3).toFixed(2);
    const freeMemGB = (os.freemem() / 1024 ** 3).toFixed(2);
    const usedMemGB = (Number(totalMemGB) - Number(freeMemGB)).toFixed(2);
    const uptimeHours = (os.uptime() / 3600).toFixed(2);
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";

    const info = [
      `Hệ điều hành: ${os.type()} ${os.release()} (${os.arch()})`,
      `Tên máy: ${os.hostname()}`,
      `CPU: ${cpuModel} (${cpus.length} cores)`,
      `Bộ nhớ RAM: Đang dùng ${usedMemGB} GB / Tổng ${totalMemGB} GB (Còn trống ${freeMemGB} GB)`,
      `Thời gian máy đã hoạt động (Uptime): ${uptimeHours} giờ`,
    ].join("\n");

    return {
      content: [
        {
          type: "text",
          text: info,
        },
      ],
    };
  }
);

// Tool 3: Máy tính số học
server.tool(
  "calculate",
  "Thực hiện các phép tính số học cơ bản (+, -, *, /)",
  {
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("Phép tính: add (cộng), subtract (trừ), multiply (nhân), divide (chia)"),
    a: z.number().describe("Số thứ nhất"),
    b: z.number().describe("Số thứ hai"),
  },
  async ({ operation, a, b }) => {
    let result: number;
    let symbol: string;

    switch (operation) {
      case "add":
        result = a + b;
        symbol = "+";
        break;
      case "subtract":
        result = a - b;
        symbol = "-";
        break;
      case "multiply":
        result = a * b;
        symbol = "*";
        break;
      case "divide":
        if (b === 0) {
          return {
            isError: true,
            content: [{ type: "text", text: "Lỗi: Không thể chia cho số 0!" }],
          };
        }
        result = a / b;
        symbol = "/";
        break;
    }

    return {
      content: [
        {
          type: "text",
          text: `Kết quả: ${a} ${symbol} ${b} = ${result}`,
        },
      ],
    };
  }
);

// 2. Chạy server qua stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hieu Local MCP Server is running via stdio!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
