/**
/**
 * DCODE CLUB — Certificate Generator
 * Overlays text on template → Supabase → EmailJS
 */

// ==================== CONFIG ====================
const SUPABASE_URL = 'https://djlbzjrvnepvqqgrsnoe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_95TepBpQ5wBB5NiLy11aeQ_iuMILNev';

const DEFAULT_FIELDS = [
	{ id: 'name', label: 'Recipient Name', x: 50, y: 48, fontSize: 44, font: 'Inter', color: '#1e1b4b', align: 'center', weight: '600' },
	{ id: 'event', label: 'Event Name', x: 50, y: 64, fontSize: 20, font: 'Inter', color: '#334155', align: 'center', weight: '500' },
	{ id: 'date', label: 'Date', x: 28, y: 88, fontSize: 17, font: 'JetBrains Mono', color: '#0f172a', align: 'left', weight: '500' },
	{ id: 'certId', label: 'Certificate ID', x: 60, y: 88, fontSize: 15, font: 'JetBrains Mono', color: '#2563eb', align: 'right', weight: '500' },
];

// ... (keep all existing code until the generateOneCertificate function)

// ==================== CERTIFICATE ENGINE ====================
async function generateOneCertificate(participant, index) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const img = state.templateImage;

	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;

	// Draw template
	ctx.drawImage(img, 0, 0);

	// Generate IDs
	const year = new Date().getFullYear();
	const seq = String(index + 1).padStart(4, '0');
	const certId = `CC-${year}-${state.event.code}-${seq}`;
	const eventId = `${state.event.code}-${year}`;
	const secretKey = generateSecretKey();
	const checksum = generateChecksum(certId, secretKey);

	// Draw fields
	state.fields.forEach(field => {
		let text = '';
		if (field.id === 'name') text = participant.name;
		else if (field.id === 'event') text = state.event.name;
		else if (field.id === 'date') text = formatDate(state.event.date);
		else if (field.id === 'certId') text = certId;

		const x = (field.x / 100) * canvas.width;
		const y = (field.y / 100) * canvas.height;
		// Scale font relative to a 1200px reference width
		const scaleFactor = canvas.width / 1200;
		const fontSize = field.fontSize * scaleFactor;

		ctx.font = `${field.weight || '500'} ${fontSize}px ${field.font || 'Inter'}, sans-serif`;
		ctx.fillStyle = field.color || '#000000';
		ctx.textAlign = field.align || 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, x, y);
	});

	// Export
	const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
	const dataUrl = canvas.toDataURL('image/png');

	// Save to Supabase
	let imagePath = null;
	let dbSaved = false;
	let emailSent = false;

	if (state.useSupabase && state.supabase) {
		try {
			// Upload image to Storage
			const fileName = `${certId}.png`;
			const { data: uploadData, error: uploadErr } = await state.supabase.storage
				.from('certificates')
				.upload(fileName, blob, { contentType: 'image/png', upsert: true });

			if (!uploadErr) {
				imagePath = uploadData.path;
			}

			// Insert metadata
			const { error: dbErr } = await state.supabase.from('certificates').insert({
				cert_id: certId,
				secret_key: secretKey,
				name: participant.name,
				email: participant.email || null,
				event: state.event.name,
				event_id: eventId,
				date: state.event.date,
				issuer: 'Coding Club HQ',
				skills: state.event.skills,
				tier: state.event.tier,
				checksum: checksum,
				image_path: imagePath,
				issue_date: state.event.date,
			});

			dbSaved = !dbErr;
			if (dbErr) console.error('[Gen] DB insert error:', dbErr);
		} catch (err) {
			console.error('[Gen] Supabase error:', err);
		}
	}

	// Send Email via EmailJS
	if (state.emailjsReady && participant.email && els.emailjsService.value && els.emailjsTemplate.value) {
		try {
			const templateParams = {
				to_name: participant.name,
				to_email: participant.email,
				event_name: state.event.name,
				cert_id: certId,
				verify_url: `${window.location.origin}/index.html?cert=${encodeURIComponent(certId)}`,
			};

			await emailjs.send(
				els.emailjsService.value,
				els.emailjsTemplate.value,
				templateParams
			);
			emailSent = true;

			// Update emailed flag in Supabase
			if (state.useSupabase && imagePath) {
				await state.supabase.from('certificates')
					.update({ emailed: true })
					.eq('cert_id', certId);
			}
		} catch (err) {
			console.error('[Gen] Email failed:', err);
		}
	}

	// Add to ZIP
	if (state.zip) {
		state.zip.file(`${certId}_${participant.name.replace(/\s+/g, '_')}.png`, blob);
	}

	return {
		certId,
		secretKey,
		checksum,
		participant,
		blob,
		dataUrl,
		imagePath,
		dbSaved,
		emailSent,
	};
}

// ... (rest of the file stays the same)
function generateChecksum(certId, secret) {
	// Simple visible checksum for the certificate
	const str = btoa(certId + ':' + secret).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
	return str.match(/.{1,4}/g).join('-');
}

// ==================== RESULTS UI ====================
function addResultRow(result) {
	const tr = document.createElement('tr');

	if (result.error) {
		tr.innerHTML = `
      <td colspan="7" style="color:var(--danger);font-weight:500;">
        Error for ${escapeHtml(result.participant.name)}: ${escapeHtml(result.error)}
      </td>
    `;
		els.resultsBody.appendChild(tr);
		return;
	}

	const statusClass = result.dbSaved ? 'status-success' : 'status-error';
	const statusText = result.dbSaved ? 'Saved' : 'Local Only';
	const emailStatus = result.emailSent ? 'Sent' : (result.participant.email ? 'Failed' : 'No Email');
	const emailClass = result.emailSent ? 'status-success' : (result.participant.email ? 'status-error' : 'status-pending');

	tr.innerHTML = `
    <td><code>${escapeHtml(result.certId)}</code></td>
    <td>${escapeHtml(result.participant.name)}</td>
    <td>${escapeHtml(result.participant.email || '—')}</td>
    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    <td>${result.imagePath ? 'Uploaded' : '—'}</td>
    <td><span class="status-badge ${emailClass}">${emailStatus}</span></td>
    <td>
      <a href="${result.dataUrl}" download="${result.certId}.png" class="action-btn small">Download</a>
    </td>
  `;
	els.resultsBody.appendChild(tr);
}

// ==================== ZIP DOWNLOAD ====================
els.downloadZipBtn.addEventListener('click', async () => {
	if (!state.zip) return;
	const content = await state.zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(content);
	const a = document.createElement('a');
	a.href = url;
	a.download = `certificates_${state.event.code}_${Date.now()}.zip`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	showToast('ZIP downloaded.');
});

// ==================== UTILITIES ====================
function showToast(msg) {
	const old = document.querySelector('.toast-msg');
	if (old) old.remove();
	const t = document.createElement('div');
	t.className = 'toast-msg';
	t.textContent = msg;
	t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:1000;animation:toastIn 0.3s ease;';
	document.body.appendChild(t);
	setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

function escapeHtml(text) {
	const d = document.createElement('div');
	d.textContent = String(text || '');
	return d.innerHTML;
}

// Handle window resize for canvas
window.addEventListener('resize', () => {
	renderPreview();
});
