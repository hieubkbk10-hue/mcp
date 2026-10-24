import path from 'node:path';
import { runLintEngine } from './satek-core/engine/linter.js';
import { lintI18nFile } from './satek-i18n.js';
import { RULES } from './satek-core/rules/catalog.js';

export const SATEK_PROJECT_ROOT = 'D:/Hieubkav/Reactjs/job/Satek-Client-FE';

export interface AuditFinding {
  pillar: 1 | 2 | 3 | 4 | 5;
  pillarName: string;
  ruleCode: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'RECOMMEND' | 'LOW' | 'INFO';
  line: number;
  message: string;
  suggestion?: string;
  evidence?: string;
}

export interface FileAuditResult {
  filePath: string;
  relativePath: string;
  totalViolations: number;
  byPriority: Record<string, number>;
  byPillar: {
    pillar1_FormikState: AuditFinding[];
    pillar2_SSOTConstants: AuditFinding[];
    pillar3_ApiRTKQuery: AuditFinding[];
    pillar4_TypeScriptImports: AuditFinding[];
    pillar5_UIAndI18n: AuditFinding[];
  };
  suggestedLocaleAdditions?: string;
  complianceScore: number; // 0 - 100
}

function mapRuleToPillar(ruleCode: string): { pillar: 1 | 2 | 3 | 4 | 5; name: string } {
  if (ruleCode.startsWith('RULE-FORM-') || ruleCode.startsWith('RULE-STATE-') || ruleCode.startsWith('RULE-HOOK-')) {
    return { pillar: 1, name: 'Trụ cột 1: Form & State Lifecycle (Formik + Yup)' };
  }
  if (ruleCode.startsWith('RULE-SSOT-') || ruleCode.startsWith('RULE-CONST-') || ruleCode.startsWith('RULE-DATE-') || ruleCode.startsWith('RULE-PAGE-') || ruleCode.startsWith('RULE-LIST-')) {
    return { pillar: 2, name: 'Trụ cột 2: SSOT & Hằng số Tập trung' };
  }
  if (ruleCode.startsWith('RULE-RTK-') || ruleCode.startsWith('RULE-QUERY-') || ruleCode.startsWith('RULE-API-')) {
    return { pillar: 3, name: 'Trụ cột 3: API & RTK Query Cache Hygiene' };
  }
  if (ruleCode.startsWith('RULE-IMPORT-') || ruleCode.startsWith('RULE-BARREL-') || ruleCode.startsWith('RULE-TYPE-') || ruleCode.startsWith('RULE-ANY-') || ruleCode.startsWith('RULE-CIRCULAR-')) {
    return { pillar: 4, name: 'Trụ cột 4: TypeScript Strict & Barrel Imports' };
  }
  return { pillar: 5, name: 'Trụ cột 5: UI Design Tokens & Đa ngôn ngữ (i18n)' };
}

/**
 * Audit toàn diện 5 Trụ cột cho một file cụ thể
 */
export async function auditSatekFile(targetFilePath: string, projectRoot = SATEK_PROJECT_ROOT): Promise<FileAuditResult> {
  const fullPath = path.isAbsolute(targetFilePath)
    ? targetFilePath
    : path.resolve(projectRoot, targetFilePath);

  const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');

  // 1. Chạy Satek AST Engine
  const lintEngineResult = await runLintEngine({
    cwd: projectRoot,
    path: fullPath,
  });

  const findings: AuditFinding[] = [];
  const byPriority: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    RECOMMEND: 0,
    LOW: 0,
    INFO: 0,
  };

  for (const f of lintEngineResult.findings) {
    const p = mapRuleToPillar(f.ruleCode);
    const prio = (f.priority === 'CRITICAL' ? 'HIGH' : f.priority) as 'HIGH' | 'MEDIUM' | 'RECOMMEND' | 'LOW' | 'INFO';
    byPriority[prio] = (byPriority[prio] || 0) + 1;

    findings.push({
      pillar: p.pillar,
      pillarName: p.name,
      ruleCode: f.ruleCode,
      priority: prio,
      line: f.location?.line || 1,
      message: f.message,
      suggestion: f.suggestion,
      evidence: f.evidence,
    });
  }

  // 2. Chạy Satek i18n Engine nếu là file tsx hoặc ts
  let suggestedLocaleAdditions: string | undefined;
  if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
    try {
      const i18nRes = lintI18nFile(fullPath, projectRoot);
      suggestedLocaleAdditions = i18nRes.suggestedLocaleAdditions;

      for (const issue of i18nRes.issues) {
        const priority = issue.severity === 'error' ? 'HIGH' : 'RECOMMEND';
        byPriority[priority] = (byPriority[priority] || 0) + 1;

        findings.push({
          pillar: 5,
          pillarName: 'Trụ cột 5: UI Design Tokens & Đa ngôn ngữ (i18n)',
          ruleCode: `RULE-I18N-${issue.type}`,
          priority,
          line: issue.line,
          message: issue.message,
          suggestion: issue.snippet ? `Xem lại: ${issue.snippet}` : undefined,
          evidence: issue.snippet,
        });
      }
    } catch {
      // Bỏ qua nếu lỗi đọc i18n
    }
  }

  // 3. Phân nhóm theo 5 Trụ cột
  const byPillar = {
    pillar1_FormikState: findings.filter((f) => f.pillar === 1),
    pillar2_SSOTConstants: findings.filter((f) => f.pillar === 2),
    pillar3_ApiRTKQuery: findings.filter((f) => f.pillar === 3),
    pillar4_TypeScriptImports: findings.filter((f) => f.pillar === 4),
    pillar5_UIAndI18n: findings.filter((f) => f.pillar === 5),
  };

  const totalViolations = findings.length;
  // Tính điểm đánh giá (100 là tối đa, trừ điểm dựa trên độ nghiêm trọng)
  let penalty = 0;
  penalty += (byPriority.CRITICAL || 0) * 20;
  penalty += (byPriority.HIGH || 0) * 15;
  penalty += (byPriority.MEDIUM || 0) * 8;
  penalty += (byPriority.RECOMMEND || 0) * 3;
  penalty += (byPriority.LOW || 0) * 2;
  const complianceScore = Math.max(0, 100 - penalty);

  return {
    filePath: fullPath,
    relativePath: relPath,
    totalViolations,
    byPriority,
    byPillar,
    suggestedLocaleAdditions,
    complianceScore,
  };
}

/**
 * Format kết quả audit thành Markdown trực quan
 */
export function formatAuditReport(res: FileAuditResult): string {
  let md = `## 🛡️ BÁO CÁO AUDIT 5 TRỤ CỘT: \`${res.relativePath}\`\n\n`;
  md += `* **Điểm tuân thủ:** **${res.complianceScore}/100** ${res.complianceScore >= 90 ? '✅ (Đạt chuẩn Satek)' : res.complianceScore >= 70 ? '⚠️ (Cần cải thiện)' : '❌ (Vi phạm nghiêm trọng)'}\n`;
  md += `* **Tổng số vi phạm:** ${res.totalViolations} (🔴 High: ${res.byPriority.HIGH || 0}, 🟡 Medium: ${res.byPriority.MEDIUM || 0}, 🔵 Recommend: ${res.byPriority.RECOMMEND || 0})\n\n`;

  const pillars = [
    { name: '1. Form & State Lifecycle (Formik + Yup)', items: res.byPillar.pillar1_FormikState },
    { name: '2. SSOT & Hằng số Tập trung (@/constants)', items: res.byPillar.pillar2_SSOTConstants },
    { name: '3. API & RTK Query Cache (providesTags / invalidatesTags)', items: res.byPillar.pillar3_ApiRTKQuery },
    { name: '4. TypeScript Strict & Barrel Imports (@/)', items: res.byPillar.pillar4_TypeScriptImports },
    { name: '5. UI Design Tokens (@theme) & i18n (English-as-Identifier)', items: res.byPillar.pillar5_UIAndI18n },
  ];

  md += `### 📋 Đánh giá chi tiết từng Trụ Cột:\n\n`;
  pillars.forEach((p) => {
    if (p.items.length === 0) {
      md += `#### ✅ ${p.name}: **ĐẠT (0 vi phạm)**\n\n`;
    } else {
      md += `#### ❌ ${p.name}: **${p.items.length} vi phạm**\n`;
      p.items.forEach((item) => {
        const icon = item.priority === 'HIGH' || item.priority === 'CRITICAL' ? '🔴' : item.priority === 'MEDIUM' ? '🟡' : '🔵';
        md += `- ${icon} **Dòng ${item.line} [${item.ruleCode}]**: ${item.message}\n`;
        if (item.suggestion) {
          md += `  > 💡 *Khắc phục:* ${item.suggestion}\n`;
        }
      });
      md += `\n`;
    }
  });

  if (res.suggestedLocaleAdditions) {
    md += `### 🌐 Gợi ý bổ sung từ điển i18n:\n\`\`\`typescript\n${res.suggestedLocaleAdditions}\n\`\`\`\n`;
  }

  return md;
}

/**
 * Tra cứu danh mục quy chuẩn của Satek
 */
export function listSatekRules(keyword?: string) {
  let list = RULES;
  if (keyword) {
    const kw = keyword.toLowerCase();
    list = RULES.filter(
      (r) =>
        r.code.toLowerCase().includes(kw) ||
        r.name.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw)
    );
  }

  return list.map((r) => ({
    code: r.code,
    name: r.name,
    category: r.category,
    severity: r.severity,
    description: r.description,
    fix: r.fix,
  }));
}
