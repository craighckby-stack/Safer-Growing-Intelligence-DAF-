import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables are set
    const githubToken = !!process.env.GITHUB_TOKEN;
    const geminiApiKey = !!process.env.GOOGLE_API_KEY;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      github: githubToken,
      gemini: geminiApiKey,
      aiModel: 'gemini-1.5-flash',
      version: '1.0.0',
      configured: githubToken && geminiApiKey
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}