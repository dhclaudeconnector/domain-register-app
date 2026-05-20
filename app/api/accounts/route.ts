import { NextResponse } from 'next/server';
import { decrypt, encrypt } from '@/lib/crypto';
import { firebaseAdminFetch } from '@/lib/firebase-admin';
import type { DecryptedCredentialAccount, EncryptedCredentialAccount } from '@/types';

// 1. Hàm ghi daily log dùng Firebase Admin REST API
async function writeDailyLog(
  action: string,
  status: 'success' | 'failed',
  details: Record<string, any>
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    await firebaseAdminFetch(`logs/${today}/${timestamp}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        action,
        status,
        timestamp,
        ...details,
      }),
    });
  } catch (logError) {
    console.error('Failed to write daily log via Firebase Admin:', logError);
  }
}

// 2. Hàm đọc các tài khoản dùng Firebase Admin REST API
async function getAdminCredentialAccounts(uid: string): Promise<DecryptedCredentialAccount[]> {
  const encryptedAccounts: Record<string, EncryptedCredentialAccount> | null = await firebaseAdminFetch(
    `users/${uid}/settings/accounts.json`
  );

  if (!encryptedAccounts) return [];

  return Object.values(encryptedAccounts).map((acc) => {
    let dpdnsToken = '';
    let cloudflareApiKey = '';
    
    try {
      dpdnsToken = decrypt(acc.dpdns.token, uid);
    } catch (e) {
      console.error('Failed to decrypt DPDNS token for account', acc.id, e);
    }
    
    try {
      cloudflareApiKey = decrypt(acc.cloudflare.api_key, uid);
    } catch (e) {
      console.error('Failed to decrypt Cloudflare API key for account', acc.id, e);
    }
    
    return {
      id: acc.id,
      name: acc.name || 'Unnamed Account',
      dpdnsToken,
      cloudflareEmail: acc.cloudflare.email,
      cloudflareApiKey,
      cloudflareAccountId: acc.cloudflare.account_id,
      dpdnsVerified: acc.dpdns.verified,
      cloudflareVerified: acc.cloudflare.verified,
      created_at: acc.created_at || Date.now(),
      updated_at: acc.updated_at || Date.now(),
    };
  });
}

// 3. Hàm lưu tài khoản dùng Firebase Admin REST API
async function saveAdminCredentialAccount(
  uid: string,
  account: Omit<DecryptedCredentialAccount, 'created_at' | 'updated_at'> & { created_at?: number },
  verification: { dpdns: boolean; cloudflare: boolean }
): Promise<string> {
  const now = Date.now();
  const id = account.id || `acc_${Math.random().toString(36).substring(2, 11)}`;
  
  const encrypted: EncryptedCredentialAccount = {
    id,
    name: account.name || 'Default Account',
    dpdns: {
      token: encrypt(account.dpdnsToken, uid),
      verified: verification.dpdns,
      verified_at: now,
    },
    cloudflare: {
      email: account.cloudflareEmail,
      api_key: encrypt(account.cloudflareApiKey, uid),
      account_id: account.cloudflareAccountId,
      verified: verification.cloudflare,
      verified_at: now,
    },
    created_at: account.created_at || now,
    updated_at: now,
  };
  
  // Lưu tài khoản
  await firebaseAdminFetch(`users/${uid}/settings/accounts/${id}.json`, {
    method: 'PUT',
    body: JSON.stringify(encrypted),
  });
  
  // Cập nhật timestamp cài đặt
  await firebaseAdminFetch(`users/${uid}/settings.json`, {
    method: 'PATCH',
    body: JSON.stringify({ updated_at: now }),
  });

  return id;
}

export async function POST(request: Request) {
  // 1. Authenticate with API SECRET KEY
  const secretKey = process.env.DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY;
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
    // 4. Load existing user accounts bằng Firebase Admin API
    const existingAccounts = await getAdminCredentialAccounts(userId);
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
        await saveAdminCredentialAccount(
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
        await saveAdminCredentialAccount(
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
        resultId = await saveAdminCredentialAccount(
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
        resultId = await saveAdminCredentialAccount(
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
