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
    // 2-word passphrase: "cyber-falcon" (or "cyber falcon")
    passHashes: [
      '52d6f6c9fe7ebd0bf7fa7087f9165f0e8568ea27c1d248733078d6d0c95a580b', // cyber-falcon
      '0748446ed995d3b9d4214b5c8fc889dbc587704f9fd94b3070042bedf7ec3d3f'  // cyber falcon
    ]
  },
  {
    id: 'asif',
    name: 'Syed Asif',
    role: 'DCODE President & Lead Organizer',
    email: 'syedasif111005@gmail.com',
    // 2-word passphrase: "orbit-shield" (or "orbit shield")
    passHashes: [
      'b17c9309b82bb851403daa89e99e681a6221026e7e40e76b31f44257226081f9', // orbit-shield
      '9731f8263d64473ab717e40cbbd22ba7c625b8b3a831711c5fd051aa6011fbb3'  // orbit shield
    ]
  },
  {
    id: 'sanjivani',
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 2-word passphrase: "vertex-code" (or "vertex code")
    passHashes: [
      '46f63dc19b97c10d88f292713c8361872cab602c725c6f457b92d5a741c443f6', // vertex-code
      '7d2b37b384a3437515f1ae373bee10cf09e03e8e8bdcb587cb0f3ef2fce8cef1'  // vertex code
    ]
  },
  {
    id: 'sanjivni', // alias support for spelling "sanjivni"
    name: 'Sanjivani Jadhav',
    role: 'Faculty Coordinator / Co-Lead',
    email: 'sanjivani.jadhav.cs@gmail.com',
    // 2-word passphrase: "vertex-code" (or "vertex code")
    passHashes: [
      '46f63dc19b97c10d88f292713c8361872cab602c725c6f457b92d5a741c443f6', // vertex-code
      '7d2b37b384a3437515f1ae373bee10cf09e03e8e8bdcb587cb0f3ef2fce8cef1'  // vertex code
    ]
  }
];

const SESSION_KEY = 'dcode_admin_session_token';

// Standalone, fast SHA-256 implementation that works in all browsers and contexts (HTTP/HTTPS/Private)
function jsSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';

  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8;
  
  var hash = jsSha256.h = jsSha256.h || [];
  var k = jsSha256.k = jsSha256.k || [];
  var primeCounter = k[lengthProperty];

  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);
  
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      var i2 = i + j;
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (i2 = 3; i2 >= 0; i2--) {
      var b = (hash[i] >> (i2 * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

async function sha256(message) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('[Auth] crypto.subtle fallback to jsSha256:', e);
  }
  return jsSha256(message);
}

export async function authenticateAdmin(adminId, password) {
  const cleanId = String(adminId || '').trim().toLowerCase();
  const rawPass = String(password || '').trim();

  if (!cleanId || !rawPass) {
    return { success: false, error: 'Please enter both Admin ID and Passphrase.' };
  }

  const admin = AUTHORIZED_ADMINS.find(a => 
    a.id.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!admin) {
    return { success: false, error: 'Invalid Admin ID or Email.' };
  }

  // Check multiple variations: raw, trimmed lowercase, space replaced by hyphen, hyphen replaced by space
  const variations = [
    rawPass,
    rawPass.toLowerCase(),
    rawPass.toLowerCase().replace(/\s+/g, '-'),
    rawPass.toLowerCase().replace(/-+/g, ' ')
  ];

  let isValid = false;
  for (const v of variations) {
    const hashed = await sha256(v);
    if (Array.isArray(admin.passHashes) ? admin.passHashes.includes(hashed) : admin.passHash === hashed) {
      isValid = true;
      break;
    }
  }

  if (!isValid) {
    return { success: false, error: 'Incorrect Passphrase. Please try again.' };
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
