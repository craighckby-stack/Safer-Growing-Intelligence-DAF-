import { GoogleGenAI } from '@google/genai';

// Enhanced type definitions
interface AIRequest {
  content: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface EnhancementOptions {
  addComments?: boolean;
  optimizePerformance?: boolean;
  maintainCompatibility?: boolean;
  improveErrorHandling?: boolean;
}

// Constants for better maintainability
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 8192;
const MAX_CONTENT_LENGTH = 30000;
const MIN_CONTENT_LENGTH = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // ms

const SYSTEM_CONTEXT = `You are an expert code improvement assistant. Your task is to enhance code quality while maintaining functionality.

Guidelines:
1. Improve code readability and maintainability
2. Optimize performance where possible
3. Add error handling and validation
4. Follow best practices for language
5. Add helpful comments for complex logic
6. Ensure backwards compatibility
7. Return ONLY improved code, no explanations or markdown formatting

CRITICAL: Output only raw code without any markdown formatting, code blocks, or explanations.`;

// Initialize Google GenAI client once at module level
let googleAI: GoogleGenAI | null = null;

/**
 * Initialize Google GenAI client
 */
function getGoogleGenAI(): GoogleGenAI {
  if (!googleAI) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || apiKey === 'AIzaSy_placeholder_key') {
      throw new Error('Please replace the placeholder Gemini API key with a real key from https://makersuite.google.com/app/apikey');
    }
    googleAI = new GoogleGenAI({ apiKey });
  }
  return googleAI;
}

/**
 * Enhanced AI integration with comprehensive error handling and performance optimization
 */
export async function sendToAI(content: string, options: EnhancementOptions = {}): Promise<string> {
  // Enhanced input validation
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid content provided to AI: must be a non-empty string');
  }

  if (content.length < MIN_CONTENT_LENGTH) {
    throw new Error('Content too short for meaningful enhancement');
  }

  // Enhanced content preprocessing
  const processedContent = preprocessContent(content);
  
  if (processedContent.length > MAX_CONTENT_LENGTH) {
    console.warn(`Content exceeds recommended length (${processedContent.length} > ${MAX_CONTENT_LENGTH}), truncating...`);
    // Smart truncation that preserves code structure
    content = smartTruncate(processedContent, MAX_CONTENT_LENGTH);
  } else {
    content = processedContent;
  }

  const requestConfig: AIRequest = {
    content: buildPrompt(content, options),
    temperature: options.temperature || DEFAULT_TEMPERATURE,
    maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS
  };

  let lastError: Error | null;
  
  // Enhanced retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await makeAIRequest(requestConfig);
      const enhancedContent = processAIResponse(response);
      
      // Enhanced validation of response
      validateAIResponse(enhancedContent, content);
      
      return enhancedContent;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        console.warn(`AI request failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`AI enhancement failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Enhanced content preprocessing
 */
function preprocessContent(content: string): string {
  // Remove excessive whitespace
  let processed = content.replace(/\s+/g, ' ').trim();
  
  // Normalize line endings
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove potential sensitive information (basic implementation)
  processed = processed.replace(/password\s*=\s*['"][^'"]*['"]?/gi, 'password=***');
  processed = processed.replace(/api[_-]?key\s*=\s*['"][^'"]*['"]?/gi, 'api_key=***');
  
  return processed;
}

/**
 * Enhanced prompt building
 */
function buildPrompt(content: string, options: EnhancementOptions): string {
  let prompt = SYSTEM_CONTEXT + '\n\n';
  
  // Add specific instructions based on options
  if (options.addComments) {
    prompt += 'Please add helpful comments explaining complex logic.\n';
  }
  
  if (options.optimizePerformance) {
    prompt += 'Please optimize for performance and efficiency.\n';
  }
  
  if (options.improveErrorHandling) {
    prompt += 'Please add comprehensive error handling and validation.\n';
  }
  
  if (options.maintainCompatibility) {
    prompt += 'Please ensure backwards compatibility.\n';
  }
  
  prompt += `Improve this code for readability, efficiency, and stability:\n\n${content}`;
  
  return prompt;
}

/**
 * Enhanced AI request using official Google GenAI SDK
 */
async function makeAIRequest(config: AIRequest): Promise<any> {
  try {
    const ai = getGoogleGenAI();

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        parts: [{
          text: config.content
        }]
      }],
      config: {
        systemInstruction: SYSTEM_CONTEXT,
        temperature: config.temperature || DEFAULT_TEMPERATURE,
        maxOutputTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      }
    });

    // Enhanced response validation
    if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
      throw new Error('Invalid AI response: no candidates returned');
    }

    const candidate = response.response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Invalid AI response: no content returned');
    }

    const content = candidate.content.parts[0].text;
    const usage = response.usageMetadata;

    return {
      content: content,
      model: response.model || 'gemini-1.5-flash',
      usage: {
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
      }
    };
  } catch (error) {
    // Enhanced error categorization
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error(`AI quota exceeded: ${error.message}`);
      }
      
      if (error.message.includes('permission') || error.message.includes('access')) {
        throw new Error(`AI access denied: ${error.message}`);
      }
      
      if (error.message.includes('timeout') || error.message.includes('network')) {
        throw new Error(`AI network error: ${error.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Enhanced AI response processing
 */
function processAIResponse(response: any): string {
  let aiText = response.content;
  
  if (!aiText || typeof aiText !== 'string') {
    throw new Error('Invalid AI response: empty or non-string content');
  }

  // Enhanced content cleaning
  let cleanedText = aiText.trim();
  
  // Remove markdown code blocks with better handling
  cleanedText = removeMarkdownCodeBlocks(cleanedText);
  
  // Remove explanatory text (common patterns)
  cleanedText = removeExplanatoryText(cleanedText);
  
  // Normalize whitespace
  cleanedText = normalizeWhitespace(cleanedText);
  
  // Validate final result
  if (cleanedText.length < MIN_CONTENT_LENGTH) {
    throw new Error('AI response too short to be valid code');
  }
  
  return cleanedText;
}

/**
 * Enhanced markdown code block removal
 */
function removeMarkdownCodeBlocks(content: string): string {
  // Handle multiple code block formats
  const patterns = [
    /```[\s\S]*\n?([\s\S]*?)\n?```/gi, // Standard code blocks
    /`([^`]+)`/g, // Inline code
    /^[\s]*Here is the improved code:[\s]*$/im, // Explanatory prefixes
    /^[\s]*Improved version:[\s]*$/im // Explanatory prefixes
  ];
  
  let cleaned = content;
  
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '$1');
  }
  
  return cleaned.trim();
}

/**
 * Remove explanatory text patterns
 */
function removeExplanatoryText(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip common explanatory patterns
    if (
      trimmed.startsWith('//') && 
      (trimmed.includes('improvement') || 
       trimmed.includes('enhancement') || 
       trimmed.includes('change') ||
       trimmed.includes('modified'))
    ) {
      continue;
    }
    
    if (
      trimmed.startsWith('/*') && 
      (trimmed.includes('improvement') || 
       trimmed.includes('enhancement') || 
       trimmed.includes('change') ||
       trimmed.includes('modified'))
    ) {
      continue;
    }
    
    cleanedLines.push(line);
  }
  
  return cleanedLines.join('\n');
}

/**
 * Enhanced whitespace normalization
 */
function normalizeWhitespace(content: string): string {
  // Preserve intentional spacing in strings but normalize elsewhere
  return content
    .replace(/\t/g, '  ') // Tabs to spaces
    .replace(/\n{3,}/g, '\n') // Multiple newlines to single
    .replace(/[ \t]+$/gm, '') // Trailing whitespace
    .trim();
}

/**
 * Smart truncation that preserves code structure
 */
function smartTruncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // Try to truncate at logical boundaries
  const lines = content.split('\n');
  let truncated = '';
  let currentLength = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLength = line.length + 1; // +1 for newline
    
    if (currentLength + lineLength > maxLength) {
      // Truncate the line to fit
      const remainingLength = maxLength - currentLength;
      truncated += line.substring(0, remainingLength);
      truncated += '\n// ... (truncated)';
      break;
    }
    
    truncated += line + '\n';
    currentLength += lineLength;
  }
  
  return truncated;
}

/**
 * Enhanced response validation
 */
function validateAIResponse(enhanced: string, original: string): void {
  // Check for meaningful changes
  if (enhanced === original.trim()) {
    console.warn('AI returned unchanged content');
  }
  
  // Check for common error patterns
  const errorPatterns = [
    /error/i,
    /cannot/i,
    /failed/i,
    /unable/i
  ];
  
  for (const pattern of errorPatterns) {
    if (pattern.test(enhanced)) {
      console.warn('AI response may contain error messages:', enhanced);
    }
  }
  
  // Validate basic code structure (simplified)
  const hasCodeStructure = 
    enhanced.includes('{') || enhanced.includes('function') || 
    enhanced.includes('class') || enhanced.includes('import') ||
    enhanced.includes('const') || enhanced.includes('let') ||
    enhanced.includes('=') || enhanced.includes('return');
    
  if (!hasCodeStructure && enhanced.length > MIN_CONTENT_LENGTH) {
    console.warn('AI response may not contain valid code structure');
  }
}

/**
 * Enhanced file analysis for better enhancement decisions
 */
export function shouldEnhanceFile(filePath: string, content: string): { should: boolean; reason: string; priority: number } {
  // Enhanced file size analysis
  if (content.length < 50) {
    return { 
      should: false, 
      reason: 'File too small for meaningful enhancement',
      priority: 1
    };
  }

  // Enhanced file type detection
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm', 'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'html', 'css', 'scss', 'less', 'sass', 'vue', 'svelte', 'astro'];
  const configExtensions = ['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'config', 'conf', 'xml', 'plist', 'properties'];
  const docExtensions = ['md', 'txt', 'rst', 'adoc', 'readme'];
  const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'pdf', 'zip', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'avi', 'mov', 'mpg', 'mpeg', 'wav', 'flac', 'ogg'];

  // Skip binary files
  if (binaryExtensions.includes(fileExtension || '')) {
    return { 
      should: false, 
      reason: 'Binary file',
      priority: 1
    };
  }

  // Enhanced configuration file handling
  if (configExtensions.includes(fileExtension || '')) {
    // Allow enhancement of documentation but be more cautious
    if (docExtensions.includes(fileExtension || '')) {
      return { 
        should: true, 
        reason: 'Documentation file',
        priority: 2
      };
    }
    
    return { 
      should: false, 
      reason: 'Configuration file (potentially sensitive)',
      priority: 1
    };
  }

  // Enhanced lock file detection
  const lockPatterns = [
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /gemfile\.lock$/i,
    /composer\.lock$/i,
    /pipfile\.lock$/i,
    /poetry\.lock$/i
  ];
  
  for (const pattern of lockPatterns) {
    if (pattern.test(filePath)) {
      return { 
        should: false, 
        reason: 'Lock file (should not be modified)',
        priority: 1
      };
    }
  }

  // Priority based on file type
  if (codeExtensions.includes(fileExtension || '')) {
    return { 
      should: true, 
      reason: 'Source code file',
      priority: 3
    };
  }

  if (docExtensions.includes(fileExtension || '')) {
    return { 
      should: true, 
      reason: 'Documentation file',
      priority: 2
    };
  }

  return { 
    should: true, 
    reason: 'Unknown file type',
    priority: 2
  };
}

/**
 * Enhanced improvement summary generation
 */
export function generateEnhancementSummary(originalCode: string, enhancedCode: string, filePath: string): string {
  const improvements: string[] = [];
  
  // Enhanced code analysis
  const originalLines = originalCode.split('\n');
  const enhancedLines = enhancedCode.split('\n');
  
  // Size comparison
  const sizeDiff = enhancedCode.length - originalCode.length;
  const sizeChangePercent = originalCode.length > 0 ? (sizeDiff / originalCode.length) * 100 : 0;
  
  if (Math.abs(sizeChangePercent) > 5) {
    improvements.push(`Significant size change (${sizeChangePercent > 0 ? '+' : ''}${sizeChangePercent.toFixed(1)}%)`);
  }
  
  // Line count comparison
  const lineDiff = enhancedLines.length - originalLines.length;
  if (Math.abs(lineDiff) > 5) {
    improvements.push(`Line count changed by ${lineDiff > 0 ? '+' : ''}${lineDiff}`);
  }
  
  // Enhanced pattern detection
  if (enhancedCode.includes('try') && !originalCode.includes('try')) {
    improvements.push('Added error handling');
  }
  
  if (enhancedCode.includes('catch') && !originalCode.includes('catch')) {
    improvements.push('Added error catching');
  }
  
  if (enhancedCode.includes('const') && originalCode.includes('var')) {
    improvements.push('Updated variable declarations (var → const)');
  }
  
  if (enhancedCode.includes('let') && originalCode.includes('var')) {
    improvements.push('Updated variable declarations (var → let)');
  }
  
  // Enhanced comment analysis
  const commentLines = enhancedLines.filter(line => 
    line.trim().startsWith('//') || 
    line.trim().startsWith('/*') || 
    line.trim().startsWith('*') ||
    line.trim().startsWith('<!--')
  );
  
  const originalCommentLines = originalLines.filter(line => 
    line.trim().startsWith('//') || 
    line.trim().startsWith('/*') || 
    line.trim().startsWith('*') ||
    line.trim().startsWith('<!--')
  );
  
  if (commentLines.length > originalCommentLines.length) {
    improvements.push('Added documentation/comments');
  }
  
  // Enhanced function and class analysis
  const functionPattern = /function\s+\w+\s*\(/g;
  const classPattern = /class\s+\w+/g;
  
  const originalFunctions = (originalCode.match(functionPattern) || []).length;
  const enhancedFunctions = (enhancedCode.match(functionPattern) || []).length;
  
  if (enhancedFunctions > originalFunctions) {
    improvements.push('Added or modified functions');
  }
  
  const originalClasses = (originalCode.match(classPattern) || []).length;
  const enhancedClasses = (enhancedCode.match(classPattern) || []).length;
  
  if (enhancedClasses > originalClasses) {
    improvements.push('Added or modified classes');
  }
  
  return improvements.join(', ');
}

/**
 * Enhanced batch processing for multiple files
 */
export async function processMultipleFiles(
  files: Array<{ path: string; content: string }>,
  options: EnhancementOptions = {}
): Promise<Array<{ path: string; success: boolean; enhanced: boolean; reason?: string; error?: string }>> {
  const results = [];
  const batchSize = 5; // Process 5 files at a time to avoid overwhelming AI
  
  // Create batches
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (file) => {
      try {
        const shouldEnhance = shouldEnhanceFile(file.path, file.content);
        
        if (!shouldEnhance.should) {
          return {
            path: file.path,
            success: true,
            enhanced: false,
            reason: shouldEnhance.reason
          };
        }
        
        const enhanced = await sendToAI(file.content, options);
        
        return {
          path: file.path,
          success: true,
          enhanced: true,
          reason: shouldEnhance.reason
        };
      } catch (error) {
        return {
          path: file.path,
          success: false,
          enhanced: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming AI
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}