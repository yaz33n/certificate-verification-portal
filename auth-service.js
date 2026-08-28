/**
 * DCODE CLUB — Client-Side ID & Secret Key Authentication Engine
 * SHA-256 Hashed admin credentials with instant session persistence.
 */

export const AUTHORIZED_ADMINS = [
  {
    id: 'yaseen',
    name: 'Yaseen Khan',
    role: 'Technical Lead & System Architect',
    email: 'ysnhun412@gmail.com',
    // 4-word passphrase: "quantum falcon cyber vault"
    passHash: '97c0e50bfebb439431365667ec81510e225cf2900083932665c620291562a7b0'
  },
  {
    id: 'asif',
    name: 'Syed Asif',
    role: 'DCODE President & Lead Organizer',
    email: 'syedasif111005@gmail.com',
    // 4-word passphrase: "galaxy phoenix orbit shield"
    passHash: '1087a3d2b8e8f8c596da518fc85368032ec265fc01f187d12cdf67eebc6232f0'
  },
  {
    id: 'sanjivani',
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 4-word passphrase: "solar blossom vertex code"
    passHash: 'eeabd19880016ee8bc302969e2dc07358800ebce492e0a76be3a378d0b28541f'
  },
  {
    id: 'sanjivni', // alias support for requested spelling "sanjivni"
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 4-word passphrase: "solar blossom vertex code"
    passHash: 'eeabd19880016ee8bc302969e2dc07358800ebce492e0a76be3a378d0b28541f'
  }
];

const SESSION_KEY = 'dcode_admin_session_token';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function authenticateAdmin(adminId, password) {
  const cleanId = String(adminId || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both Admin ID and Password.' };
  }

  const admin = AUTHORIZED_ADMINS.find(a => 
    a.id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!admin) {
    return { success: false, error: 'Invalid Admin ID or Email.' };
  }

  const hashedInput = await sha256(cleanPass);
  if (hashedInput !== admin.passHash) {
    return { success: false, error: 'Incorrect Password. Please try again.' };
  }

  const sessionData = {
    id: admin.id,
    name: admin.name,
    role: admin.role,
    email: admin.email,
    displayName: admin.name,
    loggedInAt: Date.now()
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Storage notice:', e);
  }

  return { success: true, user: sessionData };
}

export function getCurrentSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.loggedInAt > 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}
