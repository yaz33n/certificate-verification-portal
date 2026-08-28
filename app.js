/**
 * DCODE CLUB — Certificate Verification Portal
 * Backend: Supabase (with offline fallback)
 */

// ============================================================
// SUPABASE SETUP — Safe initialization
// ============================================================
let supabaseClient = null;
let useSupabase = false;

try {
	// Check if Supabase library loaded from CDN
	if (typeof supabase !== 'undefined' && supabase.createClient) {
		const SUPABASE_URL = 'https://djlbzjrvnepvqqgrsnoe.supabase.co';      // <-- REPLACE THIS
		const SUPABASE_ANON_KEY = 'sb_publishable_95TepBpQ5wBB5NiLy11aeQ_iuMILNev';                     // <-- REPLACE THIS

		if (SUPABASE_URL.includes('your-project')) {
			console.warn('[CertPortal] Supabase URL not configured yet. Running in LOCAL DEMO mode.');
		} else {
			supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
			useSupabase = true;
			console.log('[CertPortal] Supabase connected.');
		}
	} else {
		console.warn('[CertPortal] Supabase CDN not loaded. Running in LOCAL DEMO mode.');
	}
} catch (err) {
	console.error('[CertPortal] Supabase init failed:', err);
	console.warn('[CertPortal] Falling back to LOCAL DEMO mode.');
}

// ============================================================
// DEMO REGISTRY (works offline, no internet needed)
// ============================================================
const DEMO_REGISTRY = {
	"CC-2025-DEV-8492": {
		name: "Alex Rivera",
		event: "DevCraft FullStack Hackathon 2025",
		date: "2025-03-15",
		issuer: "Coding Club HQ",
		skills: ["React", "Node.js", "MongoDB", "Docker"],
		checksum: "a3f7c9d2e1b8c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7e2d1",
		perk: "20% discount on bootcamps and workshops",
		tier: "Gold Architect",
		events_attended: 7
	},
	"CC-2024-ALGO-1044": {
		name: "Elena Rostova",
		event: "Advanced Python & Algorithmic Design",
		date: "2024-11-08",
		issuer: "Coding Club HQ",
		skills: ["Python", "DSA", "Graph Theory", "Dynamic Programming"],
		checksum: "b8e2d1f4a9c5...f4a9",
		perk: "10% discount on next workshop",
		tier: "Silver Contributor",
		events_attended: 4
	},
	"CC-2024-RUST-7721": {
		name: "Marcus Vance",
		event: "Rust System Programming Masterclass",
		date: "2024-09-22",
		issuer: "Coding Club HQ",
		skills: ["Rust", "Systems", "Memory Safety", "Concurrency"],
		checksum: "c5a1b3d7e8f2...d7e8",
		perk: null,
		tier: "Bronze Builder",
		events_attended: 2
	},
	"CC-2025-WEB3-3019": {
		name: "Siddharth Rao",
		event: "Web3 & Smart Contract Security",
		date: "2025-01-18",
		issuer: "Coding Club HQ",
		skills: ["Solidity", "Ethereum", "Security Audits", "Hardhat"],
		checksum: "d2f8a4c1b6e3...c1b6",
		perk: "20% discount on bootcamps and workshops",
		tier: "Gold Architect",
		events_attended: 8
	},
	"CC-2025-AI-9012": {
		name: "Sophia Chen",
		event: "AI & Neural Networks Sprint",
		date: "2025-02-10",
		issuer: "Coding Club HQ",
		skills: ["PyTorch", "Transformers", "NLP", "Computer Vision"],
		checksum: "e4c7b2a9f3d1...a9f3",
		perk: "10% discount on next workshop",
		tier: "Silver Contributor",
		events_attended: 5
	},
	"CC-2024-OSS-4433": {
		name: "David Miller",
		event: "Open Source Contributor Fellowship",
		date: "2024-12-05",
		issuer: "Coding Club HQ",
		skills: ["Git", "CI/CD", "Documentation", "Community"],
		checksum: "f1a9d5b8e2c4...b8e2",
		perk: null,
		tier: "Bronze Builder",
		events_attended: 1
	}
};

// ============================================================
// DOM REFERENCES
// ============================================================
const certInput = document.getElementById('certInput');
const verifyBtn = document.getElementById('verifyBtn');
const resultArea = document.getElementById('resultArea');

if (!certInput || !verifyBtn || !resultArea) {
	console.error('[CertPortal] ERROR: Missing DOM elements. Check your HTML IDs.');
}

// ============================================================
// VERIFY FUNCTION (auto-routes to Supabase or local)
// ============================================================
async function verify(certId) {
	certId = (certId || '').trim().toUpperCase();
	if (!certId) return;

	console.log('[CertPortal] Verifying:', certId);

	// Show loading
	resultArea.innerHTML = `
    <div style="text-align:center;padding:24px;color:var(--text-secondary,#64748b);">
      <div style="width:24px;height:24px;border:2px solid #cbd5e1;border-top-color:#0f172a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 8px;"></div>
      <div style="font-size:13px;">Verifying certificate...</div>
    </div>
  `;
	resultArea.classList.remove('hidden');

	if (useSupabase && supabaseClient) {
		await verifyWithSupabase(certId);
	} else {
		console.log('[CertPortal] Using local demo registry.');
		verifyLocal(certId);
	}
}
// ============================================================
// SUPABASE VERIFICATION (updated for generator schema)
// ============================================================
async function verifyWithSupabase(certId) {
	try {
		const { data, error } = await supabaseClient
			.from('certificates')
			.select('*')
			.eq('cert_id', certId)
			.single();

		if (error || !data) {
			console.log('[CertPortal] Supabase returned no match. Trying local fallback...');
			verifyLocal(certId);
			return;
		}

		// Map database schema to the format expected by renderValid
		const mapped = {
			name: data.name,
			event: data.event,
			date: data.date || data.issue_date || data.event_date,
			issuer: data.issuer || 'Coding Club HQ',
			skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(',').map(s => s.trim()) : []),
			checksum: data.checksum || 'N/A',
			tier: data.tier || 'Bronze Builder',
			events_attended: data.events_attended || 1,
			perk: getPerkForTier(data.tier),
			image_path: data.image_path,
			emailed: data.emailed,
		};

		console.log('[CertPortal] Supabase match found:', data.name);
		renderValid(certId, mapped);
	} catch (err) {
		console.error('[CertPortal] Supabase query failed:', err);
		console.log('[CertPortal] Falling back to local registry.');
		verifyLocal(certId);
	}
}

// Add this helper function
function getPerkForTier(tier) {
	if (tier === 'Gold Architect') return '20% discount on bootcamps and workshops';
	if (tier === 'Silver Contributor') return '10% discount on next workshop';
	return null;
}


// ============================================================
// LOCAL VERIFICATION (offline fallback)
// ============================================================
function verifyLocal(certId) {
	const data = DEMO_REGISTRY[certId];
	if (data) {
		console.log('[CertPortal] Local match found:', data.name);
		renderValid(certId, data);
	} else {
		console.log('[CertPortal] No local match for:', certId);
		renderInvalid(certId);
	}
}

// ============================================================
// RENDER: VALID
// ============================================================
function renderValid(certId, data) {
	const skills = Array.isArray(data.skills) ? data.skills : [];
	const skillsHtml = skills
		.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`)
		.join('');

	const perkHtml = data.perk
		? `<div class="perk-banner">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0;color:var(--warning,#f59e0b);"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>
        <span class="perk-text">${escapeHtml(data.perk)} — ${escapeHtml(data.tier)}</span>
       </div>`
		: '';

	resultArea.innerHTML = `
    <div class="result-valid">
      <div class="result-header">
        <svg class="result-icon" viewBox="0 0 24 24" fill="var(--positive,#10b981)" style="width:22px;height:22px;flex-shrink:0;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 14.17L7.41 12.59l1.18-1.18L11 13.83l4.59-4.59L16.77 10.4 11 16.17Z"/></svg>
        <div>
          <div class="result-title">Authentic Certificate</div>
          <div class="result-sub">SHA-256 signed and verified by Coding Club</div>
        </div>
      </div>
      <div class="cred-grid">
        <div class="cred-item"><div class="cred-label">Recipient</div><div class="cred-value">${escapeHtml(data.name)}</div></div>
        <div class="cred-item"><div class="cred-label">Event</div><div class="cred-value">${escapeHtml(data.event)}</div></div>
        <div class="cred-item"><div class="cred-label">Issue Date</div><div class="cred-value">${escapeHtml(data.date)}</div></div>
        <div class="cred-item"><div class="cred-label">Issuer</div><div class="cred-value">${escapeHtml(data.issuer || 'Coding Club HQ')}</div></div>
        <div class="cred-item"><div class="cred-label">Certificate ID</div><div class="cred-value mono">${escapeHtml(certId)}</div></div>
        <div class="cred-item"><div class="cred-label">Checksum</div><div class="cred-value mono">${escapeHtml(data.checksum)}</div></div>
      </div>
      <div class="skills-row">${skillsHtml}</div>
      ${perkHtml}
      <div class="result-actions">
        <button class="action-btn" onclick="window.print()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M19 9h-1V4H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 6h8v3H8V6zm8 14H8v-4h8v4zm2-4v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z"/></svg>
          Print
        </button>
        <button class="action-btn" onclick="copyLink('${escapeHtml(certId)}')" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          Copy link
        </button>
        <button class="action-btn" onclick="resetVerification()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          Verify another
        </button>
      </div>
    </div>
  `;
	resultArea.classList.remove('hidden');
}

// ============================================================
// RENDER: INVALID
// ============================================================
function renderInvalid(certId) {
	resultArea.innerHTML = `
    <div class="result-invalid">
      <div class="result-header">
        <svg class="result-icon" viewBox="0 0 24 24" fill="var(--danger,#ef4444)" style="width:22px;height:22px;flex-shrink:0;"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2V7Zm0 8h2v2h-2v-2Z"/></svg>
        <div>
          <div class="result-title">Certificate Not Found</div>
          <div class="result-sub">This ID does not exist in our registry</div>
        </div>
      </div>
      <p class="invalid-help">
        Please double-check the certificate ID. If you believe this is an error, contact support at
        <a href="mailto:certificates@codingclub.dev">certificates@codingclub.dev</a>
        with the ID: <code>${escapeHtml(certId)}</code>
      </p>
      <div class="result-actions">
        <button class="action-btn" onclick="resetVerification()" type="button">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          Try again
        </button>
      </div>
    </div>
  `;
	resultArea.classList.remove('hidden');
}

// ============================================================
// ACTIONS
// ============================================================
function resetVerification() {
	certInput.value = '';
	resultArea.classList.add('hidden');
	resultArea.innerHTML = '';
	certInput.focus();
}

function copyLink(certId) {
	const baseUrl = window.location.href.split('?')[0];
	const url = baseUrl + '?cert=' + encodeURIComponent(certId);

	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(url)
			.then(() => showToast('Link copied!'))
			.catch(() => showToast(url));
	} else {
		const ta = document.createElement('textarea');
		ta.value = url;
		ta.style.cssText = 'position:fixed;opacity:0;';
		document.body.appendChild(ta);
		ta.select();
		try { document.execCommand('copy'); showToast('Link copied!'); }
		catch { showToast(url); }
		document.body.removeChild(ta);
	}
}

function showToast(msg) {
	const old = document.querySelector('.toast-msg');
	if (old) old.remove();
	const t = document.createElement('div');
	t.className = 'toast-msg';
	t.textContent = msg;
	t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:1000;animation:toastIn 0.3s ease;';
	document.body.appendChild(t);
	setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(text) {
	const d = document.createElement('div');
	d.textContent = String(text || '');
	return d.innerHTML;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
if (verifyBtn) {
	verifyBtn.addEventListener('click', () => verify(certInput.value));
	console.log('[CertPortal] Verify button listener attached.');
} else {
	console.error('[CertPortal] verifyBtn not found in DOM!');
}

if (certInput) {
	certInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') verify(certInput.value);
	});
}

document.querySelectorAll('.pill').forEach((p, i) => {
	p.addEventListener('click', () => verify(p.dataset.id));
});

document.querySelectorAll('.cert-card').forEach((c, i) => {
	c.addEventListener('click', () => verify(c.dataset.id));
});

// ============================================================
// URL PARAMS (deep link / QR)
// ============================================================
function checkUrlParams() {
	const params = new URLSearchParams(window.location.search);
	const urlId = params.get('id') || params.get('cert') || params.get('code');
	if (urlId) {
		certInput.value = urlId;
		verify(urlId);
	}
}

checkUrlParams();

// ============================================================
// SPINNER KEYFRAME (injected once)
// ============================================================
const s = document.createElement('style');
s.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(10px); } }
`;
document.head.appendChild(s);

console.log('[CertPortal] App initialized. Mode:', useSupabase ? 'Supabase' : 'LOCAL DEMO');
