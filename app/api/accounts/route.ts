import { NextResponse } from 'next/server';
import { CredentialsService } from '@/services/credentials.service';
import { db } from '@/lib/firebase';
import { ref as dbRef, set } from 'firebase/database';

async function writeDailyLog(
  action: string,
  status: 'success' | 'failed',
  details: Record<string, any>
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const logRef = dbRef(db, `logs/${today}/${timestamp}`);
    await set(logRef, {
      action,
      status,
      timestamp,
      ...details,
    });
  } catch (logError) {
    console.error('Failed to write daily log to Firebase:', logError);
  }
}

export async function POST(request: Request) {
  // 1. Authenticate with API SECRET KEY
  const secretKey = process.env.BACKEND_API_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'API Secret Key is not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const clientToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  // Extract client IP for logging
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  if (!clientToken || clientToken !== secretKey) {
    await writeDailyLog('AUTH_FAILED', 'failed', {
      ip,
      message: 'Unauthorized API call attempt with invalid or missing secret key.',
    });
    return NextResponse.json({ error: 'Unauthorized. Invalid API Secret Key.' }, { status: 401 });
  }

  // 2. Parse request payload
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    await writeDailyLog('BAD_REQUEST', 'failed', {
      ip,
      message: 'Failed to parse JSON body.',
    });
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const { userId, service, name, email, token, apiKey, accountId } = body;

  // 3. Validation
  if (!userId) {
    await writeDailyLog('VALIDATION_FAILED', 'failed', {
      ip,
      message: 'Missing userId parameter.',
    });
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
  }

  if (service !== 'dpdns' && service !== 'cloudflare') {
    await writeDailyLog('VALIDATION_FAILED', 'failed', {
      ip,
      userId,
      message: 'Invalid service. Must be "dpdns" or "cloudflare".',
    });
    return NextResponse.json({ error: 'Invalid service. Must be "dpdns" or "cloudflare".' }, { status: 400 });
  }

  if (!email) {
    await writeDailyLog('VALIDATION_FAILED', 'failed', {
      ip,
      userId,
      message: 'Missing email identifier.',
    });
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 });
  }

  try {
    // 4. Load existing user accounts
    const existingAccounts = await CredentialsService.load(userId);
    const existing = existingAccounts.find(
      (acc) => acc.cloudflareEmail?.toLowerCase() === email.toLowerCase()
    );

    let resultId = '';
    let isUpdate = false;

    if (existing) {
      isUpdate = true;
      resultId = existing.id;
      if (service === 'dpdns') {
        if (!token) {
          return NextResponse.json({ error: 'Missing DPDNS token.' }, { status: 400 });
        }
        await CredentialsService.save(
          userId,
          {
            ...existing,
            name: name || existing.name,
            dpdnsToken: token,
          },
          {
            dpdns: true,
            cloudflare: existing.cloudflareVerified,
          }
        );
      } else {
        // service === 'cloudflare'
        if (!apiKey || !accountId) {
          return NextResponse.json({ error: 'Missing Cloudflare apiKey or accountId.' }, { status: 400 });
        }
        await CredentialsService.save(
          userId,
          {
            ...existing,
            name: name || existing.name,
            cloudflareEmail: email,
            cloudflareApiKey: apiKey,
            cloudflareAccountId: accountId,
          },
          {
            dpdns: existing.dpdnsVerified,
            cloudflare: true,
          }
        );
      }
    } else {
      // Create new account
      if (service === 'dpdns') {
        if (!token) {
          return NextResponse.json({ error: 'Missing DPDNS token.' }, { status: 400 });
        }
        resultId = await CredentialsService.save(
          userId,
          {
            id: '',
            name: name || 'DPDNS Account',
            dpdnsToken: token,
            cloudflareEmail: email,
            cloudflareApiKey: '',
            cloudflareAccountId: '',
            dpdnsVerified: true,
            cloudflareVerified: false,
          },
          {
            dpdns: true,
            cloudflare: false,
          }
        );
      } else {
        // service === 'cloudflare'
        if (!apiKey || !accountId) {
          return NextResponse.json({ error: 'Missing Cloudflare apiKey or accountId.' }, { status: 400 });
        }
        resultId = await CredentialsService.save(
          userId,
          {
            id: '',
            name: name || 'Cloudflare Account',
            dpdnsToken: '',
            cloudflareEmail: email,
            cloudflareApiKey: apiKey,
            cloudflareAccountId: accountId,
            dpdnsVerified: false,
            cloudflareVerified: true,
          },
          {
            dpdns: false,
            cloudflare: true,
          }
        );
      }
    }

    const logAction = `${isUpdate ? 'UPDATE' : 'CREATE'}_${service.toUpperCase()}_ACCOUNT`;
    await writeDailyLog(logAction, 'success', {
      ip,
      userId,
      email,
      accountId: resultId,
      message: `Account successfully ${isUpdate ? 'updated' : 'created'} for service ${service}.`,
    });

    return NextResponse.json({
      success: true,
      accountId: resultId,
      action: isUpdate ? 'updated' : 'created',
    });
  } catch (error: any) {
    const errMessage = error?.message || String(error);
    await writeDailyLog('SERVER_ERROR', 'failed', {
      ip,
      userId,
      email,
      service,
      error: errMessage,
    });
    return NextResponse.json({ error: 'Internal Server Error', details: errMessage }, { status: 500 });
  }
}
