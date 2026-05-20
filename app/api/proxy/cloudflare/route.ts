import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

export async function POST(req: NextRequest) {
  try {
    const { endpoint, method, body, email, apiKey } = await req.json();
    if (!email || !apiKey) {
      return NextResponse.json({ success: false, message: 'Missing Cloudflare credentials' }, { status: 400 });
    }
    if (!endpoint?.startsWith('/') || endpoint.startsWith('//') || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ success: false, message: 'Invalid proxy request' }, { status: 400 });
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
      method,
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({ success: res.ok }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloudflare proxy failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
