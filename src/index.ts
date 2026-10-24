import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import os from "node:os";
import path from "node:path";
import { exec } from "node:child_process";
import notifier from "node-notifier";
import { YoutubeTranscript } from "youtube-transcript";

function playSystemSound(type = "asterisk") {
  const soundMap: Record<string, string> = {
    asterisk: "[System.Media.SystemSounds]::Asterisk.Play()",
    exclamation: "[System.Media.SystemSounds]::Exclamation.Play()",
    beep: "[System.Media.SystemSounds]::Beep.Play()",
    hand: "[System.Media.SystemSounds]::Hand.Play()",
  };
  const psCmd = soundMap[type] || soundMap.asterisk;
  try {
    exec(`powershell.exe -NoProfile -Command "${psCmd}"`);
  } catch {
    // Ignore if sound fails
  }
}

// 1. Khởi tạo MCP Server Tiện ích máy tính cá nhân
const server = new McpServer({
  name: "hieu-local",
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

// Tool 4: Bắn thông báo Windows Toast Notification kèm âm thanh và avatar hài hước
server.tool(
  "notify_windows",
  "Bắn thông báo Windows Toast Notification lên góc màn hình kèm âm thanh và icon hài hước khi AI hoàn thành task hoặc cần báo cho người dùng.",
  {
    title: z.string().describe("Tiêu đề thông báo (vd: Task hoàn tất, Satek Audit thành công)"),
    message: z.string().describe("Nội dung chi tiết của thông báo"),
    icon: z
      .enum(["toast", "zany", "party", "laugh", "poo", "coffee", "robot", "cat", "dog", "fire", "ghost"])
      .optional()
      .describe("Chọn icon hài hước: toast (bánh mì ngủ zzz), zany (ngáo ngơ 🤪), party (quẩy tiệc 🥳), laugh (cười xỉu 😂), poo (cục poo vui vẻ 💩), cat (mèo cute 🐱), dog (chó cưng 🐶), fire (cháy khét 🔥), ghost (con ma 👻), coffee (cà phê chill ☕), robot (người máy 🤖)"),
    soundType: z
      .enum(["asterisk", "exclamation", "beep", "hand"])
      .optional()
      .describe("Loại âm thanh: asterisk (ting nhẹ, mặc định), exclamation (cảnh báo), beep (bíp), hand (lỗi)"),
  },
  async ({ title, message, icon = "toast", soundType = "asterisk" }) => {
    try {
      const options: any = {
        title,
        message,
        appID: "Satek Droid",
        wait: false,
      };

      if (icon && icon !== "toast") {
        const iconPath = path.resolve("D:/Hieubkav/MCP/assets/icons", `${icon}.png`);
        options.icon = iconPath;
      }

      notifier.notify(options);
      playSystemSound(soundType);

      return {
        content: [
          {
            type: "text",
            text: `🔔 Đã gửi thông báo Windows Toast: "${title}" - "${message}" (icon: ${icon}, âm thanh: ${soundType})`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi gửi thông báo: ${error.message}` }],
      };
    }
  }
);

// Tool 5: Phát âm thanh chuông báo (Chime)
server.tool(
  "play_chime",
  "Phát âm thanh chuông (Chime/Ting) trên loa máy tính để gây sự chú ý của người dùng khi làm xong việc.",
  {
    soundType: z
      .enum(["asterisk", "exclamation", "beep", "hand"])
      .optional()
      .describe("Loại âm thanh: asterisk (ting nhẹ), exclamation (ting cao), beep (bíp), hand (lỗi)"),
  },
  async ({ soundType = "asterisk" }) => {
    try {
      playSystemSound(soundType);
      return {
        content: [
          {
            type: "text",
            text: `🎵 Đã phát chuông hệ thống (${soundType}) thành công!`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi phát âm thanh: ${error.message}` }],
      };
    }
  }
);

// Tool 6: Lấy phụ đề / kịch bản video YouTube từ URL (Không cần tải video về)
server.tool(
  "get_youtube_transcript",
  "Lấy toàn bộ phụ đề / kịch bản lời thoại (transcript) của một video YouTube chỉ bằng đường link (URL). Tuyệt đối không cần tải video về máy.",
  {
    urlOrVideoId: z
      .string()
      .describe("Đường link video YouTube (vd: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...) hoặc ID video"),
    lang: z
      .string()
      .optional()
      .describe("Mã ngôn ngữ phụ đề mong muốn (vd: 'en' cho tiếng Anh, 'vi' cho tiếng Việt). Nếu không truyền sẽ lấy ngôn ngữ mặc định."),
    includeTimestamps: z
      .boolean()
      .optional()
      .describe("Có kèm theo mốc thời gian [phút:giây] ở từng câu không (mặc định: false, trả về đoạn văn liền mạch)"),
  },
  async ({ urlOrVideoId, lang, includeTimestamps = false }) => {
    try {
      const options: any = {};
      if (lang) options.lang = lang;

      const transcript = await YoutubeTranscript.fetchTranscript(urlOrVideoId, options);
      if (!transcript || transcript.length === 0) {
        return {
          content: [{ type: "text", text: "Không tìm thấy phụ đề (transcript) cho video này." }],
        };
      }

      function formatTime(ms: number) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }

      let formattedText: string;
      if (includeTimestamps) {
        formattedText = transcript
          .map((item) => `[${formatTime(item.offset)}] ${item.text.replace(/\n/g, " ")}`)
          .join("\n");
      } else {
        formattedText = transcript
          .map((item) => item.text.replace(/\n/g, " "))
          .join(" ");
      }

      return {
        content: [
          {
            type: "text",
            text: `### 🎬 KỊCH BẢN YOUTUBE BÓC TÁCH THÀNH CÔNG (${transcript.length} đoạn):\n\n${formattedText}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Lỗi bóc tách phụ đề YouTube: ${error.message}` }],
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
