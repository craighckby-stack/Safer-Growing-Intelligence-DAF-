import { Octokit } from '@octokit/rest';

// Enhanced type definitions
interface GitHubFile {
  path: string;
  sha: string;
  size?: number;
  type: 'file' | 'dir';
  content?: string;
}

interface GitHubContent {
  content: string;
  sha: string;
  size: number;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitHubPullRequest {
  number: number;
  html_url: string;
  state: string;
  title: string;
  body: string;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
}

interface RepositoryStats {
  totalFiles: number;
  processedFiles: number;
  enhancedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  processingTime: number;
}

// Constants for better maintainability
const MAX_FILE_SIZE = 100000; // 100KB
const MAX_FILES_PER_REQUEST = 100;
const DEFAULT_BRANCH = 'main';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // ms

/**
 * Enhanced GitHub service with comprehensive error handling and performance optimization
 */
export class GitHubService {
  private octokit: Octokit;
  private requestCache: Map<string, any> = new Map();
  private rateLimitResetTime: number = 0;
  private consecutiveErrors: number = 0;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    this.octokit = new Octokit({ 
      auth: process.env.GITHUB_TOKEN,
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          console.warn(`GitHub rate limit hit, retrying after ${retryAfter}s`);
          this.rateLimitResetTime = Date.now() + (retryAfter * 1000);
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          console.warn(`GitHub secondary rate limit hit, retrying after ${retryAfter}s`);
          return true;
        }
      },
      request: {
        agent: 'AI-Autonomous-Enhancer/1.0.0',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    });
  }

  /**
   * Enhanced repository file listing with better error handling and caching
   */
  async listFilesRecursive(owner: string, repo: string, dir: string = '', branch: string = DEFAULT_BRANCH): Promise<GitHubFile[]> {
    const cacheKey = `files:${owner}:${repo}:${branch}:${dir}`;
    
    // Check cache first
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    try {
      const files: GitHubFile[] = [];
      const processedDirs = new Set<string>();
      
      await this.processDirectory(owner, repo, dir, branch, files, processedDirs);
      
      // Cache the result
      this.requestCache.set(cacheKey, files);
      
      // Set cache expiration (5 minutes)
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);
      
      return files;
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`Error listing files in ${dir}:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to list files after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      // Enhanced retry logic
      if (error instanceof Error && error.message.includes('rate limit')) {
        const waitTime = this.rateLimitResetTime - Date.now();
        if (waitTime > 0) {
          console.log(`Waiting ${Math.ceil(waitTime / 1000)}s for rate limit reset...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      throw new Error(`Failed to list repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced directory processing with better performance
   */
  private async processDirectory(
    owner: string, 
    repo: string, 
    dir: string, 
    branch: string, 
    files: GitHubFile[], 
    processedDirs: Set<string>
  ): Promise<void> {
    try {
      const res = await this.octokit.rest.repos.getContent({ 
        owner, 
        repo, 
        path: dir, 
        ref: branch 
      });

      const items = Array.isArray(res.data) ? res.data : [res.data];
      
      for (const item of items) {
        if (item.type === 'file') {
          files.push({ 
            path: item.path, 
            sha: item.sha, 
            size: item.size || 0,
            type: 'file'
          });
        } else if (item.type === 'dir') {
          if (!processedDirs.has(item.path)) {
            processedDirs.add(item.path);
            await this.processDirectory(owner, repo, item.path, branch, files, processedDirs);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to process directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced file content retrieval with better error handling
   */
  async getFileContent(owner: string, repo: string, path: string, branch: string = DEFAULT_BRANCH): Promise<GitHubContent> {
    const cacheKey = `content:${owner}:${repo}:${branch}:${path}`;
    
    // Check cache first
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    try {
      const res = await this.octokit.rest.repos.getContent({ 
        owner, 
        repo, 
        path: path, 
        ref: branch 
      });

      if ('content' in res.data && 'sha' in res.data) {
        const content: GitHubContent = {
          content: Buffer.from(res.data.content, 'base64').toString('utf-8'),
          sha: res.data.sha,
          size: res.data.size || 0
        };

        // Cache the result
        this.requestCache.set(cacheKey, content);
        
        // Set cache expiration (2 minutes)
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 2 * 60 * 1000);

        return content;
      }

      throw new Error('Invalid file response from GitHub API');
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`Error getting file content for ${path}:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to get file content after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      throw new Error(`Failed to get file content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced file update with better validation and error handling
   */
  async updateFile(
    owner: string, 
    repo: string, 
    branch: string, 
    path: string, 
    content: string, 
    sha: string,
    message: string
  ): Promise<void> {
    try {
      // Enhanced content validation
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content provided for file update');
      }

      if (content.length > MAX_FILE_SIZE * 2) {
        console.warn(`File content is large (${content.length} bytes), this may fail`);
      }

      // Enhanced file size check
      const originalContent = await this.getFileContent(owner, repo, path, branch);
      if (originalContent.size > MAX_FILE_SIZE) {
        throw new Error(`File too large for enhancement (${originalContent.size} bytes > ${MAX_FILE_SIZE} bytes)`);
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch,
        path,
        message: `[AI Enhancement] ${message}`,
        content: Buffer.from(content).toString('base64'),
        sha
      });

      // Invalidate cache for this file
      const cacheKey = `content:${owner}:${repo}:${branch}:${path}`;
      this.requestCache.delete(cacheKey);
      
      this.consecutiveErrors = 0; // Reset on success
      
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`Error updating file ${path}:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to update file after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      throw new Error(`Failed to update file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced branch management with better error handling
   */
  async ensureBranch(owner: string, repo: string, branch: string, base: string = DEFAULT_BRANCH): Promise<{ exists: boolean; created?: boolean }> {
    try {
      await this.octokit.rest.git.getRef({ 
        owner, 
        repo, 
        ref: `heads/${branch}` 
      });
      
      return { exists: true };
    } catch (error: any) {
      if (error.status === 404) {
        try {
          // Get base branch reference
          const baseRef = await this.octokit.rest.git.getRef({ 
            owner, 
            repo, 
            ref: `heads/${base}` 
          });

          await this.octokit.rest.git.createRef({ 
            owner, 
            repo, 
            ref: `refs/heads/${branch}`, 
            sha: baseRef.data.object.sha 
          });

          return { exists: false, created: true };
        } catch (createError) {
          throw new Error(`Failed to create branch: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
        }
      }
      
      throw new Error(`Failed to check branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced pull request creation with better validation
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ number: number; html_url: string }> {
    try {
      // Enhanced validation
      if (!title || title.trim().length === 0) {
        throw new Error('Pull request title is required');
      }

      if (!body || body.trim().length === 0) {
        throw new Error('Pull request body is required');
      }

      if (!head || !base) {
        throw new Error('Both head and base branches are required');
      }

      const pr = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: `[AI Enhancement] ${title}`,
        body,
        head,
        base,
        draft: false // Ensure it's not a draft
      });

      this.consecutiveErrors = 0; // Reset on success
      
      return {
        number: pr.data.number,
        html_url: pr.data.html_url
      };
    } catch (error) {
      this.consecutiveErrors++;
      console.error('Error creating pull request:', error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to create pull request after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      throw new Error(`Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced repository validation
   */
  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      this.consecutiveErrors = 0; // Reset on successful validation
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      
      this.consecutiveErrors++;
      console.error('Error validating repository:', error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to validate repository after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      throw new Error(`Repository validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced repository information retrieval
   */
  async getRepository(owner: string, repo: string) {
    try {
      const res = await this.octokit.rest.repos.get({ owner, repo });
      this.consecutiveErrors = 0; // Reset on success
      return res.data;
    } catch (error) {
      this.consecutiveErrors++;
      console.error('Error getting repository info:', error instanceof Error ? error.message : 'Unknown error');
      
      if (this.consecutiveErrors >= RETRY_ATTEMPTS) {
        throw new Error(`Failed to get repository info after ${RETRY_ATTEMPTS} consecutive attempts`);
      }
      
      throw new Error(`Failed to get repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced batch file processing for better performance
   */
  async processMultipleFiles(
    owner: string,
    repo: string,
    branch: string,
    files: GitHubFile[],
    processor: (file: GitHubFile) => Promise<any>
  ): Promise<any[]> {
    const results = [];
    const startTime = Date.now();
    
    // Process files in batches to avoid overwhelming GitHub
    const batches = [];
    for (let i = 0; i < files.length; i += MAX_FILES_PER_REQUEST) {
      batches.push(files.slice(i, i + MAX_FILES_PER_REQUEST));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchPromises = batch.map(file => processor(file));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Add error results for failed files
        const errorResults = batch.map(file => ({
          path: file.path,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        }));
        results.push(...errorResults);
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Processed ${files.length} files in ${processingTime}ms`);
    
    return results;
  }

  /**
   * Enhanced statistics and monitoring
   */
  getStats(): RepositoryStats {
    return {
      totalFiles: this.requestCache.size,
      processedFiles: this.consecutiveErrors,
      enhancedFiles: 0, // This would be tracked during actual processing
      skippedFiles: 0,
      errorFiles: this.consecutiveErrors,
      processingTime: 0
    };
  }

  /**
   * Enhanced cache management
   */
  clearCache(): void {
    this.requestCache.clear();
    console.log('GitHub service cache cleared');
  }

  /**
   * Enhanced health check
   */
  async healthCheck(): Promise<{ status: string; github: boolean; gemini: boolean; configured: boolean }> {
    try {
      // Test GitHub connectivity
      const testRepo = await this.octokit.rest.repos.get({ owner: 'darlekkhan', repo: 'example-repo' })
        .then(() => true)
        .catch(() => false);
      
      return {
        status: 'ok',
        github: testRepo,
        gemini: !!process.env.GOOGLE_API_KEY,
        configured: testRepo && !!process.env.GOOGLE_API_KEY
      };
    } catch (error) {
      return {
        status: 'error',
        github: false,
        gemini: !!process.env.GOOGLE_API_KEY,
        configured: false
      };
    }
  }

  /**
   * Enhanced error recovery
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = RETRY_ATTEMPTS,
    baseDelay: number = RETRY_DELAY_BASE
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        this.consecutiveErrors = 0; // Reset on success
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}