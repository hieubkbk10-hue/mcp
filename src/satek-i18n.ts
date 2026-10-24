import fs from 'node:fs';
import path from 'node:path';

const VIETNAMESE_REGEX = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;
const DEFAULT_PROJECT_ROOT = 'D:/Hieubkav/Reactjs/job/Satek-Client-FE';

export interface I18nIssue {
  line: number;
  type: 'HARDCODED_VIETNAMESE' | 'INVALID_KEY_FORMAT' | 'STRING_CONCATENATION' | 'MISSING_TRANSLATION';
  severity: 'error' | 'warning';
  message: string;
  snippet?: string;
}

export interface LintResult {
  filePath: string;
  namespace: string;
  totalIssues: number;
  errors: number;
  warnings: number;
  issues: I18nIssue[];
  missingKeys: string[];
  suggestedLocaleAdditions?: string;
}

/**
 * Đọc và trích xuất danh sách key từ file locale .ts (dạng const x = { 'Key': 'Value' })
 */
export function extractKeysFromLocaleFile(localeFilePath: string): Set<string> {
  const keys = new Set<string>();
  if (!fs.existsSync(localeFilePath)) {
    return keys;
  }

  const content = fs.readFileSync(localeFilePath, 'utf-8');
  const lines = content.split('\n');

  // Regex trích xuất key: 'Key': 'Value' hoặc "Key": "Value" hoặc Key: 'Value'
  const keyRegex = /^\s*(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_$-]+))\s*:/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      trimmed.startsWith('const ')
    ) {
      continue;
    }

    const match = keyRegex.exec(line);
    if (match) {
      const key = match[1] || match[2] || match[3];
      if (key && !['const', 'export', 'default', 'import', 'type'].includes(key)) {
        keys.add(key);
      }
    }
  }

  return keys;
}

/**
 * Kiểm tra trùng lặp key trong 1 file locale (phòng chống TS1117)
 */
export function checkDuplicateKeysInLocale(localeFilePath: string): { key: string; lines: number[] }[] {
  if (!fs.existsSync(localeFilePath)) {
    return [];
  }

  const content = fs.readFileSync(localeFilePath, 'utf-8');
  const lines = content.split('\n');
  const keyMap = new Map<string, number[]>();
  const keyRegex = /^\s*(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_$-]+))\s*:/;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      trimmed.startsWith('const ')
    ) {
      return;
    }

    const match = keyRegex.exec(line);
    if (match) {
      const key = match[1] || match[2] || match[3];
      if (key && !['const', 'export', 'default', 'import', 'type'].includes(key)) {
        const existing = keyMap.get(key) || [];
        existing.push(lineNum);
        keyMap.set(key, existing);
      }
    }
  });

  const duplicates: { key: string; lines: number[] }[] = [];
  keyMap.forEach((lineNumbers, key) => {
    if (lineNumbers.length > 1) {
      duplicates.push({ key, lines: lineNumbers });
    }
  });

  return duplicates;
}

/**
 * Lint và kiểm tra toàn diện 1 file component (.tsx hoặc .ts) theo chuẩn Satek i18n
 */
export function lintI18nFile(targetFilePath: string, projectRoot = DEFAULT_PROJECT_ROOT): LintResult {
  const fullPath = path.isAbsolute(targetFilePath)
    ? targetFilePath
    : path.join(projectRoot, targetFilePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File không tồn tại: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const issues: I18nIssue[] = [];

  // 1. Trích xuất namespace từ useTranslation('...')
  const namespaceMatch = content.match(/useTranslation\(\s*['"]([a-zA-Z0-9_-]+)['"]\s*\)/);
  const namespace = namespaceMatch ? namespaceMatch[1] : 'default';

  // 2. Tải từ điển locale tương ứng và common.ts
  const domainLocalePath = path.join(projectRoot, 'src/locales/vi', `${namespace}.ts`);
  const commonLocalePath = path.join(projectRoot, 'src/locales/vi/common.ts');

  const knownKeys = new Set<string>([
    ...extractKeysFromLocaleFile(domainLocalePath),
    ...extractKeysFromLocaleFile(commonLocalePath),
  ]);

  const usedTransKeys = new Set<string>();
  const missingKeys: string[] = [];

  // 3. Quét từng dòng
  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    // Bỏ qua comment
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // Check A: Kiểm tra nối chuỗi với hàm trans(...) - Cấm nối chuỗi thủ công trong JSX
    if (/trans\([^)]+\)\s*\+|\+\s*trans\([^)]+\)/.test(lineText)) {
      issues.push({
        line: lineNum,
        type: 'STRING_CONCATENATION',
        severity: 'error',
        message: 'Cấm nối chuỗi thủ công với trans(). Bắt buộc dùng tham số nội suy {{paramName}}.',
        snippet: trimmed,
      });
    }

    // Check B: Trích xuất các hàm trans('...') hoặc t('...')
    const transMatches = [...lineText.matchAll(/(?:trans|t)\(\s*(['"`])((?:\\.|[^\\])*?)\1/g)];
    for (const match of transMatches) {
      const key = match[2];
      usedTransKeys.add(key);

      // Rule: 100% Key bằng tiếng Anh chuẩn (English-as-Identifier)
      if (VIETNAMESE_REGEX.test(key)) {
        issues.push({
          line: lineNum,
          type: 'INVALID_KEY_FORMAT',
          severity: 'error',
          message: `Key "${key}" chứa tiếng Việt! Bắt buộc dùng English-as-Identifier (key tiếng Anh).`,
          snippet: trimmed,
        });
      } else if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(key) || /^[a-z0-9]+(-[a-z0-9]+)+$/.test(key)) {
        // Cảnh báo key dạng snake_case / kebab_case như btn_lock
        issues.push({
          line: lineNum,
          type: 'INVALID_KEY_FORMAT',
          severity: 'warning',
          message: `Key "${key}" dạng code identifier! Quy chuẩn Satek yêu cầu tiếng Anh tự nhiên (Title Case hoặc Sentence Case).`,
          snippet: trimmed,
        });
      }

      // Rule: Kiểm tra xem key tiếng Anh đã có bản dịch trong vi/{domain}.ts hoặc vi/common.ts chưa
      if (!VIETNAMESE_REGEX.test(key) && knownKeys.size > 0 && !knownKeys.has(key)) {
        // Loại trừ các key động hoặc quá ngắn nếu không phù hợp
        if (!missingKeys.includes(key)) {
          missingKeys.push(key);
          issues.push({
            line: lineNum,
            type: 'MISSING_TRANSLATION',
            severity: 'warning',
            message: `Key "${key}" chưa có bản dịch tiếng Việt trong src/locales/vi/${namespace}.ts hoặc common.ts.`,
            snippet: trimmed,
          });
        }
      }
    }

    // Check C: Hardcode tiếng Việt trong JSX hoặc attributes (ngoài trans)
    // Loại trừ các dòng đã bọc hoàn toàn bằng trans(...)
    if (VIETNAMESE_REGEX.test(lineText)) {
      // Bóc tách text nằm trong thẻ JSX (> Tiếng Việt <)
      const jsxTextMatches = [...lineText.matchAll(/>([^<{}]*?[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ][^<{}]*?)</gi)];
      for (const m of jsxTextMatches) {
        const textInside = m[1].trim();
        if (textInside && !textInside.startsWith('{') && !textInside.endsWith('}')) {
          issues.push({
            line: lineNum,
            type: 'HARDCODED_VIETNAMESE',
            severity: 'error',
            message: `Hardcode tiếng Việt trong JSX: "${textInside}". Phải bọc qua trans('English Key').`,
            snippet: trimmed,
          });
        }
      }

      // Bóc tách các attribute như placeholder="...", title="...", label="..." có tiếng Việt mà không dùng trans(...)
      const attrMatches = [...lineText.matchAll(/(placeholder|title|label|alt|aria-label)=["']([^"']*?[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ][^"']*?)["']/gi)];
      for (const m of attrMatches) {
        const attrName = m[1];
        const attrValue = m[2];
        issues.push({
          line: lineNum,
          type: 'HARDCODED_VIETNAMESE',
          severity: 'error',
          message: `Thuộc tính ${attrName}="${attrValue}" bị hardcode tiếng Việt. Hãy dùng ${attrName}={trans('English Key')}.`,
          snippet: trimmed,
        });
      }
    }
  });

  // Tạo code snippet gợi ý cho các key chưa có bản dịch
  let suggestedLocaleAdditions = '';
  if (missingKeys.length > 0) {
    const linesToAdd = missingKeys
      .map((k) => `  '${k}': 'Bản dịch tiếng Việt tại đây',`)
      .join('\n');
    suggestedLocaleAdditions = `// Thêm vào src/locales/vi/${namespace}.ts:\n${linesToAdd}`;
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return {
    filePath: path.relative(projectRoot, fullPath),
    namespace,
    totalIssues: issues.length,
    errors,
    warnings,
    issues,
    missingKeys,
    suggestedLocaleAdditions: missingKeys.length > 0 ? suggestedLocaleAdditions : undefined,
  };
}

/**
 * Quét toàn bộ một thư mục để tìm lỗi i18n
 */
export function scanFolderI18n(folderPath: string, projectRoot = DEFAULT_PROJECT_ROOT): LintResult[] {
  const fullFolderPath = path.isAbsolute(folderPath)
    ? folderPath
    : path.join(projectRoot, folderPath);

  if (!fs.existsSync(fullFolderPath)) {
    throw new Error(`Thư mục không tồn tại: ${fullFolderPath}`);
  }

  const results: LintResult[] = [];

  function traverse(dir: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const p = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.agents'].includes(file.name)) {
          traverse(p);
        }
      } else if (file.isFile() && (file.name.endsWith('.tsx') || (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')))) {
        // Bỏ qua các file trong locales và routeTree
        if (p.includes(path.normalize('/locales/')) || p.includes(path.normalize('\\locales\\')) || file.name === 'routeTree.gen.ts') {
          continue;
        }
        try {
          const res = lintI18nFile(p, projectRoot);
          if (res.totalIssues > 0) {
            results.push(res);
          }
        } catch {
          // Bỏ qua nếu lỗi đọc file
        }
      }
    }
  }

  traverse(fullFolderPath);
  return results;
}
