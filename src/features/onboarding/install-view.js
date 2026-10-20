import { images } from '../experiences/data.js';

export function installView({ canPrompt, status, platform }, devPreview = false) {
  const installed = status === 'installed' || status === 'accepted';
  const guidance = platform === 'ios'
    ? `<li>Buka halaman ini di <strong>Safari</strong>.</li><li>Ketuk tombol <strong>Bagikan</strong>, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li><li>Ketuk <strong>Tambah</strong> dan buka aplikasi melalui ikonnya.</li>`
    : platform === 'android'
      ? `<li>Buka menu browser <strong>⋮</strong>.</li><li>Pilih <strong>Install app</strong> atau <strong>Tambahkan ke layar utama</strong>.</li><li>Buka aplikasi melalui ikon yang baru terpasang.</li>`
      : `<li>Buka menu browser Anda.</li><li>Pilih <strong>Install app</strong> bila tersedia.</li><li>Buka aplikasi melalui ikon yang baru terpasang.</li>`;
  return `<div class="app-shell install-shell">
    <div class="install-visual" style="background-image:url('${images.login}')"><div class="brand"><span class="brand-badge">FMG</span><span class="brand-name">FindMyGuide</span></div></div>
    <main class="install-content">
      <div class="install-symbol" aria-hidden="true">↧</div>
      <h1>${installed ? 'Aplikasi siap digunakan' : 'Pasang aplikasi untuk melanjutkan'}</h1>
      <p>${installed ? 'Sekarang buka aplikasi dari ikon di layar utama. Halaman browser ini tidak dapat membuka aplikasi secara otomatis di semua perangkat.' : 'Nikmati pengalaman layar penuh dan akses perjalanan Anda lebih mudah dari layar utama.'}</p>
      ${canPrompt && !installed ? '<button class="primary-button full" data-action="install-app">Install aplikasi</button>' : ''}
      <div class="install-steps"><strong>${installed ? 'Langkah terakhir' : 'Cara memasang'}</strong><ol>${guidance}</ol></div>
      <p class="install-note">Pemasangan selalu memerlukan persetujuan Anda. Jika aplikasi sudah terpasang, buka melalui ikonnya.</p>
      ${devPreview ? '<button class="install-preview" data-action="preview-in-browser">Pratinjau di browser (khusus pengembangan)</button>' : ''}
    </main>
  </div>`;
}
