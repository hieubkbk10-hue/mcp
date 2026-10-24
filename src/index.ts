import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import os from "node:os";
import {
  lintI18nFile,
  scanFolderI18n,
  checkDuplicateKeysInLocale,
} from "./satek-i18n.js";

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

// Tool 4: Lint kiểm tra i18n cho 1 file (.tsx hoặc .ts) theo chuẩn Satek
server.tool(
  "satek_i18n_lint_file",
  "Kiểm tra 1 file code trong Satek-Client-FE xem có vi phạm quy chuẩn i18n (hardcode tiếng Việt, sai English-as-Identifier, cấm nối chuỗi, thiếu bản dịch) không.",
  {
    filePath: z
      .string()
      .describe("Đường dẫn file cần check (tương đối hoặc tuyệt đối, vd: src/components/setting/tabs/VatTab.tsx)"),
    projectRoot: z
      .string()
      .optional()
      .describe("Thư mục gốc của project Satek-Client-FE (mặc định: D:/Hieubkav/Reactjs/job/Satek-Client-FE)"),
  },
  async ({ filePath, projectRoot }) => {
    try {
      const result = lintI18nFile(filePath, projectRoot);
      let output = `### Báo cáo kiểm tra i18n: \`${result.filePath}\`\n\n`;
      output += `- **Namespace phát hiện:** \`${result.namespace}\`\n`;
      output += `- **Tổng số vấn đề:** ${result.totalIssues} (${result.errors} lỗi, ${result.warnings} cảnh báo)\n\n`;

      if (result.issues.length === 0) {
        output += `✅ **Tuyệt vời! File tuân thủ 100% quy chuẩn i18n của Satek.**\n`;
      } else {
        output += `#### Chi tiết các vấn đề:\n`;
        result.issues.forEach((issue) => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️';
          output += `- ${icon} **Dòng ${issue.line} [${issue.type}]:** ${issue.message}\n`;
          if (issue.snippet) {
            output += `  > \`${issue.snippet}\`\n`;
          }
        });
      }

      if (result.suggestedLocaleAdditions) {
        output += `\n#### Gợi ý bản dịch tiếng Việt cần bổ sung:\n\`\`\`typescript\n${result.suggestedLocaleAdditions}\n\`\`\`\n`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi khi kiểm tra file: ${error.message}` }],
      };
    }
  }
);

// Tool 5: Quét kiểm tra i18n toàn bộ một thư mục
server.tool(
  "satek_i18n_scan_folder",
  "Quét toàn bộ thư mục trong Satek-Client-FE để tìm tất cả các file vi phạm i18n.",
  {
    folderPath: z
      .string()
      .describe("Đường dẫn thư mục cần quét (vd: src/components/setting hoặc src/routes)"),
    projectRoot: z
      .string()
      .optional()
      .describe("Thư mục gốc của project (mặc định: D:/Hieubkav/Reactjs/job/Satek-Client-FE)"),
  },
  async ({ folderPath, projectRoot }) => {
    try {
      const results = scanFolderI18n(folderPath, projectRoot);
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `✅ Thư mục \`${folderPath}\` hoàn toàn sạch, không có vi phạm i18n nào!`,
            },
          ],
        };
      }

      let output = `### Phát hiện ${results.length} file có vi phạm i18n trong \`${folderPath}\`:\n\n`;
      let totalErr = 0;
      let totalWarn = 0;

      results.forEach((r) => {
        totalErr += r.errors;
        totalWarn += r.warnings;
        output += `* **\`${r.filePath}\`** (${r.errors} lỗi, ${r.warnings} cảnh báo, namespace: \`${r.namespace}\`)\n`;
        r.issues.forEach((issue) => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️';
          output += `  - ${icon} Dòng ${issue.line}: ${issue.message}\n`;
        });
      });

      output += `\n**Tổng cộng:** ${totalErr} lỗi (cần sửa gấp), ${totalWarn} cảnh báo.\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi khi quét thư mục: ${error.message}` }],
      };
    }
  }
);

// Tool 6: Kiểm tra trùng lặp key trong file locales/vi (phòng chống TS1117)
server.tool(
  "satek_i18n_check_duplicate_keys",
  "Kiểm tra trùng lặp key trong file từ điển src/locales/vi/*.ts (ngăn chặn lỗi TS1117).",
  {
    localeFilePath: z
      .string()
      .describe("Đường dẫn file locale cần kiểm tra (vd: D:/Hieubkav/Reactjs/job/Satek-Client-FE/src/locales/vi/setting.ts)"),
  },
  async ({ localeFilePath }) => {
    try {
      const duplicates = checkDuplicateKeysInLocale(localeFilePath);
      if (duplicates.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `✅ File \`${localeFilePath}\` không có key nào bị trùng lặp (Clean TS1117)!`,
            },
          ],
        };
      }

      let output = `❌ Phát hiện ${duplicates.length} key bị trùng lặp trong \`${localeFilePath}\`:\n\n`;
      duplicates.forEach((d) => {
        output += `- Key **"${d.key}"** xuất hiện ở các dòng: ${d.lines.join(", ")}\n`;
      });
      output += `\n*Hãy xóa bớt các khai báo trùng lặp để tránh lỗi TS1117.*\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi: ${error.message}` }],
      };
    }
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
