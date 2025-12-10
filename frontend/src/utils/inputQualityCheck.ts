/**
 * 输入质量检测工具
 * 对聊天记录进行快速 NLP 检查，提供质量反馈
 */

export type QualityLevel = 'good' | 'warning' | 'error';

export interface QualityIssue {
  type: string;
  level: QualityLevel;
  message: string;
  suggestion?: string;
}

export interface QualityCheckResult {
  isValid: boolean;
  overallLevel: QualityLevel;
  issues: QualityIssue[];
  stats: {
    totalLines: number;
    myMessages: number;
    otherMessages: number;
    turnCount: number; // 对话往返次数
    hasGibberish: boolean;
    hasSystemMessages: boolean;
  };
}

// 常见的说话人标识
const MY_SPEAKER_PATTERNS = [
  /^我[：:]/,
  /^me[：:]/i,
  /^i[：:]/i,
  /^自己[：:]/,
];

const OTHER_SPEAKER_PATTERNS = [
  /^对方[：:]/,
  /^他[：:]/,
  /^她[：:]/,
  /^TA[：:]/i,
  /^other[：:]/i,
  /^partner[：:]/i,
  // 匹配任意名字（非"我"开头的说话人）
  /^[^\s我]{1,10}[：:]/,
];

// 系统消息/通知的特征
const SYSTEM_MESSAGE_PATTERNS = [
  /撤回了一条消息/,
  /你已添加了/,
  /以上是打招呼的内容/,
  /对方已同意/,
  /开启了朋友验证/,
  /加入了群聊/,
  /退出了群聊/,
  /移出了群聊/,
  /修改群名为/,
  /发起了语音通话/,
  /发起了视频通话/,
  /通话时长/,
  /红包已被领完/,
  /收到红包/,
  /发出红包/,
  /转账给/,
  /收款成功/,
  /以下是新消息/,
  /消息已发出/,
  /对方正在输入/,
  /^\[系统消息\]/,
  /^\[提示\]/,
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/,  // 日期格式
  /^\d{1,2}:\d{2}(:\d{2})?$/,  // 纯时间
  /^(上午|下午|凌晨|晚上)\s*\d{1,2}:\d{2}/,
];

// 乱码检测特征
const GIBBERISH_PATTERNS = [
  /[�□■◆◇○●☆★]{3,}/,  // 连续乱码字符
  /[\x00-\x08\x0B\x0C\x0E-\x1F]{2,}/,  // 控制字符
  /(.)\1{10,}/,  // 单字符重复超过10次
  /[a-zA-Z]{20,}/,  // 超长无空格英文（可能是乱码）
  /[\uFFFD]{2,}/,  // Unicode 替换字符
];

// 广告/营销消息特征
const AD_PATTERNS = [
  /点击链接/,
  /复制这段/,
  /淘口令/,
  /长按识别/,
  /扫码领取/,
  /优惠券/,
  /限时特价/,
  /免费领/,
  /https?:\/\/[^\s]+/,  // URL
  /\$[A-Za-z0-9]+\$/,  // 淘宝口令格式
];

/**
 * 解析对话行，识别说话人
 */
function parseLine(line: string): { speaker: 'me' | 'other' | 'unknown' | 'system'; content: string } {
  const trimmed = line.trim();
  
  if (!trimmed) {
    return { speaker: 'unknown', content: '' };
  }

  // 检查是否是系统消息
  for (const pattern of SYSTEM_MESSAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { speaker: 'system', content: trimmed };
    }
  }

  // 检查是否是"我"的消息
  for (const pattern of MY_SPEAKER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { speaker: 'me', content: trimmed.replace(pattern, '').trim() };
    }
  }

  // 检查是否是对方的消息
  for (const pattern of OTHER_SPEAKER_PATTERNS) {
    if (pattern.test(trimmed)) {
      // 排除"我"开头的
      if (!trimmed.startsWith('我')) {
        return { speaker: 'other', content: trimmed.replace(pattern, '').trim() };
      }
    }
  }

  return { speaker: 'unknown', content: trimmed };
}

/**
 * 计算对话往返次数
 */
function countTurns(speakers: ('me' | 'other' | 'unknown' | 'system')[]): number {
  let turns = 0;
  let lastSpeaker: string | null = null;
  
  for (const speaker of speakers) {
    if (speaker === 'system' || speaker === 'unknown') continue;
    
    if (lastSpeaker && lastSpeaker !== speaker) {
      turns++;
    }
    lastSpeaker = speaker;
  }
  
  return turns;
}

/**
 * 检查是否存在乱码
 */
function hasGibberish(text: string): boolean {
  for (const pattern of GIBBERISH_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查是否存在广告内容
 */
function hasAdContent(text: string): boolean {
  for (const pattern of AD_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * 主检测函数
 */
export function checkInputQuality(text: string): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return {
      isValid: false,
      overallLevel: 'error',
      issues: [],
      stats: {
        totalLines: 0,
        myMessages: 0,
        otherMessages: 0,
        turnCount: 0,
        hasGibberish: false,
        hasSystemMessages: false,
      },
    };
  }

  // 解析每一行
  const parsed = lines.map(parseLine);
  const speakers = parsed.map(p => p.speaker);
  
  // 统计
  const myMessages = speakers.filter(s => s === 'me').length;
  const otherMessages = speakers.filter(s => s === 'other').length;
  const systemMessages = speakers.filter(s => s === 'system').length;
  const unknownMessages = speakers.filter(s => s === 'unknown').length;
  const turnCount = countTurns(speakers);
  
  // 检查乱码
  const gibberishDetected = hasGibberish(text);
  
  // 检查广告
  const adDetected = hasAdContent(text);

  // === 质量检测 ===

  // 1. 检查是否包含双方对话
  if (myMessages === 0 && otherMessages === 0) {
    issues.push({
      type: 'no_speakers',
      level: 'warning',
      message: '未识别到明确的对话双方',
      suggestion: '请使用"我：xxx"和"对方：xxx"的格式标注说话人',
    });
  } else if (myMessages === 0) {
    issues.push({
      type: 'no_my_messages',
      level: 'warning',
      message: '未识别到"我"的发言',
      suggestion: '请确保包含您自己的对话内容，使用"我：xxx"格式',
    });
  } else if (otherMessages === 0) {
    issues.push({
      type: 'no_other_messages',
      level: 'warning',
      message: '未识别到对方的发言',
      suggestion: '请确保包含对方的对话内容，使用"对方：xxx"格式',
    });
  }

  // 2. 检查对话往返次数（至少 4 次往返）
  if (turnCount < 4 && (myMessages > 0 || otherMessages > 0)) {
    issues.push({
      type: 'insufficient_turns',
      level: 'warning',
      message: `对话往返次数较少（${turnCount}次）`,
      suggestion: '建议上传更完整的对话记录，至少4次往返可获得更准确的分析',
    });
  }

  // 3. 检查乱码
  if (gibberishDetected) {
    issues.push({
      type: 'gibberish',
      level: 'warning',
      message: '检测到可能的乱码内容',
      suggestion: '请检查文本是否复制完整，或尝试重新粘贴',
    });
  }

  // 4. 检查系统消息/通知
  if (systemMessages > lines.length * 0.3) {
    issues.push({
      type: 'too_many_system_messages',
      level: 'warning',
      message: '包含较多系统通知或非对话内容',
      suggestion: '建议移除系统通知、时间戳等非对话内容',
    });
  }

  // 5. 检查广告内容
  if (adDetected) {
    issues.push({
      type: 'ad_content',
      level: 'warning',
      message: '检测到可能的广告或链接内容',
      suggestion: '建议移除广告、链接等无关内容',
    });
  }

  // 6. 检查消息是否全部来自同一方（可能顺序错乱）
  if ((myMessages > 3 && otherMessages === 0) || (otherMessages > 3 && myMessages === 0)) {
    issues.push({
      type: 'single_speaker',
      level: 'warning',
      message: '消息似乎来自同一方',
      suggestion: '请检查是否遗漏了对方的消息，或者消息顺序是否正确',
    });
  }

  // 7. 检查大量未识别内容
  if (unknownMessages > (myMessages + otherMessages) && unknownMessages > 3) {
    issues.push({
      type: 'many_unknown',
      level: 'warning',
      message: '部分内容未能识别说话人',
      suggestion: '请使用"我：xxx"和"对方：xxx"的格式标注，以获得更准确的分析',
    });
  }

  // 计算整体质量等级
  let overallLevel: QualityLevel = 'good';
  if (issues.some(i => i.level === 'error')) {
    overallLevel = 'error';
  } else if (issues.length >= 2) {
    overallLevel = 'warning';
  } else if (issues.length === 1) {
    overallLevel = 'warning';
  }

  return {
    isValid: issues.filter(i => i.level === 'error').length === 0,
    overallLevel,
    issues,
    stats: {
      totalLines: lines.length,
      myMessages,
      otherMessages,
      turnCount,
      hasGibberish: gibberishDetected,
      hasSystemMessages: systemMessages > 0,
    },
  };
}

