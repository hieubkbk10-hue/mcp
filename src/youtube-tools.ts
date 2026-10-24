import ytSearch from 'yt-search';
import { YoutubeTranscript } from 'youtube-transcript';
import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export function extractVideoId(urlOrId: string): string | null {
  const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : (urlOrId.length === 11 ? urlOrId : null);
}

/**
 * 1. Tìm kiếm video YouTube theo từ khóa
 */
export async function searchYouTube(query: string, maxResults = 10) {
  const r = await ytSearch(query);
  const videos = (r.videos || []).slice(0, maxResults);
  return videos.map((v) => ({
    title: v.title,
    url: v.url,
    videoId: v.videoId,
    views: v.views,
    duration: v.timestamp,
    uploaded: v.ago,
    author: v.author.name,
    thumbnail: v.thumbnail,
    description: v.description,
  }));
}

/**
 * 2. Lấy link ảnh Thumbnail chất lượng cao nhất (Full HD / 4K)
 */
export async function getYoutubeThumbnail(urlOrId: string, downloadPath?: string) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    throw new Error(`Không nhận diện được YouTube Video ID từ: "${urlOrId}"`);
  }

  const thumbnails = {
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    hq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    mq: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    sd: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
  };

  let downloadedFile: string | undefined;

  if (downloadPath) {
    const targetDir = path.resolve(downloadPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, `${videoId}_maxres.jpg`);
    const res = await fetch(thumbnails.maxres);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      downloadedFile = filePath;
    } else {
      // Fallback sang hqdefault nếu video không có maxres
      const hqRes = await fetch(thumbnails.hq);
      if (hqRes.ok) {
        const buffer = await hqRes.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        downloadedFile = filePath;
      }
    }
  }

  return {
    videoId,
    thumbnails,
    downloadedFile,
  };
}

/**
 * 3. Cào bình luận của video YouTube (Top hoặc Mới nhất)
 */
export function getYoutubeComments(urlOrId: string, limit = 20, sort: 'popular' | 'recent' = 'popular'): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve('D:/Hieubkav/MCP/src/yt-comments.py');
    const cmd = `python "${pythonScript}" "${urlOrId}" ${limit} ${sort}`;

    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Lỗi chạy Python comment scraper: ${stderr || err.message}`));
      }
      try {
        const data = JSON.parse(stdout.trim());
        if (data.error) {
          return reject(new Error(data.error));
        }
        resolve(data);
      } catch (parseErr: any) {
        reject(new Error(`Lỗi parse JSON bình luận: ${parseErr.message} (Output: ${stdout.slice(0, 100)})`));
      }
    });
  });
}

/**
 * 4. Bóc tách phụ đề / transcript video YouTube
 */
export async function getYoutubeTranscript(urlOrVideoId: string, lang?: string, includeTimestamps = false) {
  const options: any = {};
  if (lang) options.lang = lang;

  const transcript = await YoutubeTranscript.fetchTranscript(urlOrVideoId, options);
  if (!transcript || transcript.length === 0) {
    return { count: 0, text: 'Không tìm thấy phụ đề cho video này.' };
  }

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  let formattedText: string;
  if (includeTimestamps) {
    formattedText = transcript
      .map((item) => `[${formatTime(item.offset)}] ${item.text.replace(/\n/g, ' ')}`)
      .join('\n');
  } else {
    formattedText = transcript
      .map((item) => item.text.replace(/\n/g, ' '))
      .join(' ');
  }

  return {
    count: transcript.length,
    text: formattedText,
  };
}
