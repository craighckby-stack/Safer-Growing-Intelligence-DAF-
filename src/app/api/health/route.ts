import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/ai';

export async function GET() {
  try {
    // Check if required environment variables are set
    const githubToken = !!process.env.GITHUB_TOKEN;
    const geminiApiKey = !!process.env.GOOGLE_API_KEY;

    // Get actual AI model status
    const aiHealth = await healthCheck();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      github: githubToken,
      gemini: geminiApiKey,
      aiModel: aiHealth.model,
      version: '1.0.0',
      configured: githubToken && geminiApiKey && aiHealth.ok
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}