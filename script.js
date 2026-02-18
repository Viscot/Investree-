// Data Storage
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let mbanking = JSON.parse(localStorage.getItem('mbanking') || '[]');
let gajian = JSON.parse(localStorage.getItem('gajian') || '[]');
let saham = JSON.parse(localStorage.getItem('saham') || '[]');
let emas = JSON.parse(localStorage.getItem('emas') || '[]');
let investasiLain = JSON.parse(localStorage.getItem('investasiLain') || '[]');
let utang = JSON.parse(localStorage.getItem('utang') || '[]');
let targets = JSON.parse(localStorage.getItem('targets') || '[]');

// UI State
let currentFilter = 'all';
let currentTransactionPage = 1;
const itemsPerPage = 10;

// ==================== UTILITY FUNCTIONS ====================
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    
    let result = '';
    if (absNum >= 1e12) {
        result = (absNum / 1e12).toFixed(2) + ' T';
    } else if (absNum >= 1e9) {
        result = (absNum / 1e9).toFixed(2) + ' M';
    } else if (absNum >= 1e6) {
        result = (absNum / 1e6).toFixed(2) + ' jt';
    } else if (absNum >= 1e3) {
        result = (absNum / 1e3).toFixed(1) + ' rb';
    } else {
        result = absNum.toString();
    }
    
    return isNegative ? '-' + result : result;
}

function formatRupiah(angka) {
    if (!angka && angka !== 0) return 'Rp 0';
    
    const isNegative = angka < 0;
    const absAngka = Math.abs(angka);
    
    let formatted = absAngka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return isNegative ? '-Rp ' + formatted : 'Rp ' + formatted;
}

function formatCurrency(input) {
    let value = input.value.replace(/\./g, '');
    value = value.replace(/[^0-9]/g, '');
    
    if (value === '') {
        input.value = '';
        return;
    }
    
    let num = parseInt(value);
    if (!isNaN(num)) {
        input.value = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
}

function parseRupiah(value) {
    if (!value) return 0;
    const numericValue = value.toString().replace(/[^0-9-]/g, '');
    return parseInt(numericValue) || 0;
}

// ==================== GAJIAN FUNCTIONS ====================
function updateRekeningSelect() {
    const select = document.getElementById('gajianRekening');
    if (!select) return;
    
    select.innerHTML = '<option value="">Pilih Rekening</option>';
    
    mbanking.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.id;
        option.textContent = `${bank.bankName} - Rp ${formatNumber(bank.saldo)}`;
        select.appendChild(option);
    });
}

document.getElementById('gajianForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const perusahaan = document.getElementById('gajianPerusahaan').value;
    const nominal = parseRupiah(document.getElementById('gajianNominal').value);
    const tanggal = document.getElementById('gajianTanggal').value;
    const rekeningId = document.getElementById('gajianRekening').value;

    if (!perusahaan || !nominal || !tanggal || !rekeningId) {
        alert('Harap lengkapi semua data!');
        return;
    }

    gajian.push({
        id: Date.now(),
        perusahaan: perusahaan,
        nominal: nominal,
        tanggal: tanggal,
        rekeningId: parseInt(rekeningId),
        status: 'belum',
        createdAt: new Date().toISOString()
    });

    saveGajian();
    renderGajian();
    this.reset();
});

function markGajian(id) {
    const index = gajian.findIndex(g => g.id === id);
    if (index !== -1) {
        const gaji = gajian[index];
        
        if (gaji.status === 'belum') {
            const bankIndex = mbanking.findIndex(b => b.id === gaji.rekeningId);
            if (bankIndex !== -1) {
                mbanking[bankIndex].saldo += gaji.nominal;
                mbanking[bankIndex].lastUpdate = new Date().toLocaleDateString('id-ID');
                
                transactions.unshift({
                    date: new Date().toLocaleDateString('id-ID', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    desc: `Gaji dari ${gaji.perusahaan}`,
                    amount: gaji.nominal,
                    type: 'pemasukan'
                });
                
                gajian[index].status = 'sudah';
                gajian[index].datePaid = new Date().toISOString();
                
                saveMBanking();
                saveTransactions();
                saveGajian();
                
                renderMBanking();
                renderTable();
                updateSummary();
                updateRekeningSelect();
            }
        }
    }
    renderGajian();
}

function deleteGajian(id) {
    if (confirm('Hapus catatan gajian?')) {
        gajian = gajian.filter(g => g.id !== id);
        saveGajian();
        renderGajian();
    }
}

function renderGajian() {
    const container = document.getElementById('gajianList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (gajian.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada catatan gajian</p>';
        return;
    }
    
    gajian.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    gajian.forEach(g => {
        const bank = mbanking.find(b => b.id === g.rekeningId);
        const bankName = bank ? bank.bankName : 'Rekening tidak ditemukan';
        
        container.innerHTML += `
            <div class="gajian-item ${g.status === 'sudah' ? 'gajian-sudah' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <span class="fw-bold">${g.perusahaan}</span>
                        <br>
                        <small class="text-muted">${new Date(g.tanggal).toLocaleDateString('id-ID')} · ${bankName}</small>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold gajian-nominal">${formatRupiah(g.nominal)}</span>
                        <br>
                        <small class="text-muted">(${formatNumber(g.nominal)})</small>
                        <br>
                        ${g.status === 'belum' ? `
                            <button class="btn btn-sm btn-success mt-1" onclick="markGajian(${g.id})">
                                <i class="fas fa-check"></i> Sudah
                            </button>
                        ` : `
                            <span class="badge bg-secondary mt-1">Sudah</span>
                        `}
                        <button class="btn btn-sm btn-danger mt-1" onclick="deleteGajian(${g.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== M-BANKING FUNCTIONS ====================
function addMBanking() {
    const bankName = document.getElementById('bankSelect').value;
    const saldo = parseRupiah(document.getElementById('mbankingSaldo').value);

    if (!saldo || saldo <= 0) {
        alert('Harap masukkan saldo dengan benar!');
        return;
    }

    const existingBank = mbanking.find(m => m.bankName === bankName);
    
    if (existingBank) {
        if (confirm(`Update saldo ${bankName} dari ${formatRupiah(existingBank.saldo)} menjadi ${formatRupiah(saldo)}?`)) {
            existingBank.saldo = saldo;
            existingBank.lastUpdate = new Date().toLocaleDateString('id-ID');
        }
    } else {
        mbanking.push({
            id: Date.now(),
            bankName: bankName,
            saldo: saldo,
            lastUpdate: new Date().toLocaleDateString('id-ID')
        });
    }

    saveMBanking();
    renderMBanking();
    updateRekeningSelect();
    updateSummary();
    document.getElementById('mbankingSaldo').value = '';
}

function deleteMBanking(id) {
    if (confirm('Hapus rekening ini?')) {
        mbanking = mbanking.filter(m => m.id !== id);
        saveMBanking();
        renderMBanking();
        updateRekeningSelect();
        updateSummary();
    }
}

function renderMBanking() {
    const container = document.getElementById('mbankingList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (mbanking.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada rekening</p>';
        return;
    }
    
    mbanking.forEach(m => {
        const bankClass = `bank-${m.bankName.replace(/\s+/g, '')}`;
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="bank-item ${bankClass}">
                    <div class="d-flex justify-content-between">
                        <div class="bank-nama">${m.bankName}</div>
                        <button class="btn btn-sm btn-light btn-circle" onclick="deleteMBanking(${m.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="bank-saldo">${formatRupiah(m.saldo)}</div>
                    <small>${formatNumber(m.saldo)} · Update: ${m.lastUpdate}</small>
                </div>
            </div>
        `;
    });
}

// ==================== SAHAM FUNCTIONS ====================
function addSaham() {
    const kode = document.getElementById('sahamKode').value.toUpperCase();
    const nama = document.getElementById('sahamNama').value;
    const lot = parseFloat(document.getElementById('sahamLot').value);
    const harga = parseRupiah(document.getElementById('sahamHarga').value);

    if (!kode || !nama || !lot || !harga) {
        alert('Harap lengkapi data saham!');
        return;
    }

    const lembar = lot * 100;
    const totalNilai = harga * lembar;

    saham.push({
        id: Date.now(),
        kode: kode,
        nama: nama,
        lot: lot,
        lotDisplay: lot.toFixed(2),
        lembar: lembar,
        hargaPerLembar: harga,
        totalNilai: totalNilai,
        date: new Date().toLocaleDateString('id-ID')
    });

    saveSaham();
    renderSaham();
    updateSummary();
    
    document.getElementById('sahamKode').value = '';
    document.getElementById('sahamNama').value = '';
    document.getElementById('sahamLot').value = '';
    document.getElementById('sahamHarga').value = '';
}

function updateSaham(id) {
    const sahamItem = saham.find(s => s.id === id);
    if (!sahamItem) return;
    
    const newLot = parseFloat(prompt('Masukkan lot terbaru:', sahamItem.lot));
    if (isNaN(newLot) || newLot < 0) return;
    
    const newHarga = parseInt(prompt('Masukkan harga per lembar terbaru (Rp):', sahamItem.hargaPerLembar));
    if (isNaN(newHarga) || newHarga < 0) return;
    
    sahamItem.lot = newLot;
    sahamItem.lotDisplay = newLot.toFixed(2);
    sahamItem.lembar = newLot * 100;
    sahamItem.hargaPerLembar = newHarga;
    sahamItem.totalNilai = newHarga * (newLot * 100);
    sahamItem.lastUpdate = new Date().toLocaleDateString('id-ID');
    
    saveSaham();
    renderSaham();
    updateSummary();
}

function deleteSaham(id) {
    if (confirm('Hapus saham ini?')) {
        saham = saham.filter(s => s.id !== id);
        saveSaham();
        renderSaham();
        updateSummary();
    }
}

function renderSaham() {
    const container = document.getElementById('sahamList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (saham.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada saham</p>';
        return;
    }
    
    saham.sort((a, b) => b.totalNilai - a.totalNilai);
    
    saham.forEach(s => {
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="invest-card saham-item">
                    <div class="invest-header">
                        <div>
                            <span class="invest-kode">${s.kode}</span>
                            <div class="invest-detail">${s.nama}</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning btn-circle" onclick="updateSaham(${s.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle" onclick="deleteSaham(${s.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-4">
                            <small class="text-muted">Lot</small>
                            <div class="fw-bold">${s.lotDisplay}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Lembar</small>
                            <div class="fw-bold">${formatNumber(s.lembar)}</div>
                        </div>
                        <div class="col-4">
                            <small class="text-muted">Harga/lbr</small>
                            <div class="fw-bold">${formatNumber(s.hargaPerLembar)}</div>
                        </div>
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">Total Nilai</small>
                                <span class="invest-nilai">${formatRupiah(s.totalNilai)}</span>
                            </div>
                            <small class="text-muted d-block text-end">(${formatNumber(s.totalNilai)})</small>
                        </div>
                    </div>
                    
                    <div class="mt-1 text-muted small">
                        <i class="fas fa-calendar-alt me-1"></i> ${s.date}
                        ${s.lastUpdate ? ` · Update: ${s.lastUpdate}` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== EMAS FUNCTIONS ====================
function addEmas() {
    const nama = document.getElementById('emasNama').value;
    const gram = parseFloat(document.getElementById('emasGram').value);
    const hargaPerGram = parseRupiah(document.getElementById('emasHarga').value);

    if (!nama || !gram || !hargaPerGram) {
        alert('Harap lengkapi data emas!');
        return;
    }

    // Hitung harga per 0.01 gram
    const hargaPer001Gram = hargaPerGram / 100;
    
    // Total nilai = gram * harga per gram
    const totalNilai = gram * hargaPerGram;

    emas.push({
        id: Date.now(),
        nama: nama,
        gram: gram,
        gramDisplay: gram.toFixed(2),
        hargaPerGram: hargaPerGram,
        hargaPer001Gram: hargaPer001Gram,
        totalNilai: totalNilai,
        date: new Date().toLocaleDateString('id-ID')
    });

    saveEmas();
    renderEmas();
    updateSummary();
    
    document.getElementById('emasNama').value = '';
    document.getElementById('emasGram').value = '';
    document.getElementById('emasHarga').value = '';
}

function updateEmas(id) {
    const emasItem = emas.find(e => e.id === id);
    if (!emasItem) return;
    
    const newGram = parseFloat(prompt('Masukkan gram terbaru:', emasItem.gram));
    if (isNaN(newGram) || newGram < 0) return;
    
    const newHarga = parseInt(prompt('Masukkan harga per gram terbaru (Rp):', emasItem.hargaPerGram));
    if (isNaN(newHarga) || newHarga < 0) return;
    
    emasItem.gram = newGram;
    emasItem.gramDisplay = newGram.toFixed(2);
    emasItem.hargaPerGram = newHarga;
    emasItem.hargaPer001Gram = newHarga / 100;
    emasItem.totalNilai = newGram * newHarga;
    emasItem.lastUpdate = new Date().toLocaleDateString('id-ID');
    
    saveEmas();
    renderEmas();
    updateSummary();
}

function deleteEmas(id) {
    if (confirm('Hapus emas ini?')) {
        emas = emas.filter(e => e.id !== id);
        saveEmas();
        renderEmas();
        updateSummary();
    }
}

function renderEmas() {
    const container = document.getElementById('emasList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (emas.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada emas</p>';
        return;
    }
    
    emas.sort((a, b) => b.totalNilai - a.totalNilai);
    
    emas.forEach(e => {
        const nilaiPer001Gram = e.hargaPer001Gram;
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="invest-card emas-item">
                    <div class="invest-header">
                        <div>
                            <span class="invest-kode">${e.nama}</span>
                            <div class="invest-detail">Emas Batangan</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning btn-circle" onclick="updateEmas(${e.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle" onclick="deleteEmas(${e.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-6">
                            <small class="text-muted">Berat</small>
                            <div class="fw-bold">${e.gramDisplay} gram</div>
                            <small class="text-muted">(0.01g = ${formatNumber(nilaiPer001Gram)})</small>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Harga/gram</small>
                            <div class="fw-bold">${formatNumber(e.hargaPerGram)}</div>
                            <small class="text-muted">${formatRupiah(e.hargaPerGram)}</small>
                        </div>
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">Total Nilai</small>
                                <span class="invest-nilai">${formatRupiah(e.totalNilai)}</span>
                            </div>
                            <small class="text-muted d-block text-end">(${formatNumber(e.totalNilai)})</small>
                        </div>
                    </div>
                    
                    <div class="mt-2">
                        <small class="text-muted">Detail Harga:</small>
                        <div class="d-flex justify-content-between small">
                            <span>0.01g: ${formatNumber(nilaiPer001Gram)}</span>
                            <span>1g: ${formatNumber(e.hargaPerGram)}</span>
                            <span>10g: ${formatNumber(e.hargaPerGram * 10)}</span>
                        </div>
                    </div>
                    
                    <div class="mt-1 text-muted small">
                        <i class="fas fa-calendar-alt me-1"></i> ${e.date}
                        ${e.lastUpdate ? ` · Update: ${e.lastUpdate}` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== INVESTASI LAIN FUNCTIONS ====================
function addInvestasiLain() {
    const jenis = document.getElementById('investasiLainJenis').value;
    const nama = document.getElementById('investasiLainNama').value;
    const jumlah = parseFloat(document.getElementById('investasiLainJumlah').value);
    const nilai = parseRupiah(document.getElementById('investasiLainNilai').value);

    if (!nama || !jumlah || !nilai) {
        alert('Harap lengkapi data investasi!');
        return;
    }

    const totalNilai = jumlah * nilai;

    investasiLain.push({
        id: Date.now(),
        jenis: jenis,
        nama: nama,
        jumlah: jumlah,
        nilaiPerUnit: nilai,
        totalNilai: totalNilai,
        date: new Date().toLocaleDateString('id-ID')
    });

    saveInvestasiLain();
    renderInvestasiLain();
    updateSummary();
    
    document.getElementById('investasiLainNama').value = '';
    document.getElementById('investasiLainJumlah').value = '';
    document.getElementById('investasiLainNilai').value = '';
}

function updateInvestasiLain(id) {
    const item = investasiLain.find(i => i.id === id);
    if (!item) return;
    
    const newJumlah = parseFloat(prompt('Masukkan jumlah terbaru:', item.jumlah));
    if (isNaN(newJumlah) || newJumlah < 0) return;
    
    const newNilai = parseInt(prompt('Masukkan nilai per unit terbaru (Rp):', item.nilaiPerUnit));
    if (isNaN(newNilai) || newNilai < 0) return;
    
    item.jumlah = newJumlah;
    item.nilaiPerUnit = newNilai;
    item.totalNilai = newJumlah * newNilai;
    item.lastUpdate = new Date().toLocaleDateString('id-ID');
    
    saveInvestasiLain();
    renderInvestasiLain();
    updateSummary();
}

function deleteInvestasiLain(id) {
    if (confirm('Hapus investasi ini?')) {
        investasiLain = investasiLain.filter(i => i.id !== id);
        saveInvestasiLain();
        renderInvestasiLain();
        updateSummary();
    }
}

function renderInvestasiLain() {
    const container = document.getElementById('investasiLainList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (investasiLain.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada investasi lain</p>';
        return;
    }
    
    investasiLain.sort((a, b) => b.totalNilai - a.totalNilai);
    
    investasiLain.forEach(i => {
        const jenisLabel = {
            'reksadana': 'Reksadana',
            'obligasi': 'Obligasi',
            'properti': 'Properti',
            'kripto': 'Kripto',
            'other': 'Lainnya'
        }[i.jenis] || i.jenis;
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="invest-card" style="border-left-color: #7209b7;">
                    <div class="invest-header">
                        <div>
                            <span class="invest-kode">${i.nama}</span>
                            <div class="invest-detail">${jenisLabel}</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning btn-circle" onclick="updateInvestasiLain(${i.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle" onclick="deleteInvestasiLain(${i.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-6">
                            <small class="text-muted">Jumlah</small>
                            <div class="fw-bold">${i.jumlah} unit</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Nilai/unit</small>
                            <div class="fw-bold">${formatNumber(i.nilaiPerUnit)}</div>
                        </div>
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <small class="text-muted">Total Nilai</small>
                                <span class="invest-nilai">${formatRupiah(i.totalNilai)}</span>
                            </div>
                            <small class="text-muted d-block text-end">(${formatNumber(i.totalNilai)})</small>
                        </div>
                    </div>
                    
                    <div class="mt-1 text-muted small">
                        <i class="fas fa-calendar-alt me-1"></i> ${i.date}
                        ${i.lastUpdate ? ` · Update: ${i.lastUpdate}` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== UTANG FUNCTIONS ====================
function addUtang() {
    const name = document.getElementById('utangName').value.trim();
    const amount = parseRupiah(document.getElementById('utangAmount').value);
    const dueDate = document.getElementById('utangDueDate').value;
    const type = document.getElementById('utangType').value;

    if (!name || !amount || amount <= 0) {
        alert('Harap lengkapi data!');
        return;
    }

    utang.push({
        id: Date.now(),
        name: name,
        amount: amount,
        dueDate: dueDate || 'Tanpa jatuh tempo',
        type: type,
        status: 'active',
        dateAdded: new Date().toLocaleDateString('id-ID')
    });

    saveUtang();
    renderUtang();
    updateSummary();
    
    document.getElementById('utangName').value = '';
    document.getElementById('utangAmount').value = '';
    document.getElementById('utangDueDate').value = '';
}

function markUtangAsLunas(id) {
    const index = utang.findIndex(u => u.id === id);
    if (index !== -1) {
        utang[index].status = 'lunas';
        utang[index].dateLunas = new Date().toLocaleDateString('id-ID');
        saveUtang();
        renderUtang();
        updateSummary();
    }
}

function deleteUtang(id) {
    if (confirm('Hapus catatan ini?')) {
        utang = utang.filter(u => u.id !== id);
        saveUtang();
        renderUtang();
        updateSummary();
    }
}

function renderUtang() {
    const container = document.getElementById('utangList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (utang.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada catatan utang/piutang</p>';
        return;
    }
    
    utang.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    utang.forEach(u => {
        let cardClass = 'utang-active';
        let typeLabel = u.type === 'utang' ? 'Utang' : 'Piutang';
        
        if (u.type === 'utang') {
            cardClass = u.status === 'active' ? 'utang-active' : 'utang-lunas';
        } else {
            cardClass = 'piutang-active';
        }
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="utang-card ${cardClass}">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-bold">${u.name}</span>
                            <br>
                            <small class="text-muted">${typeLabel} · Jatuh tempo: ${u.dueDate}</small>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold ${u.type === 'utang' ? 'text-danger' : 'text-success'}">
                                ${formatRupiah(u.amount)}
                            </span>
                            <br>
                            <small class="text-muted">(${formatNumber(u.amount)})</small>
                            <br>
                            ${u.type === 'utang' && u.status === 'active' ? `
                                <button class="btn btn-sm btn-success mt-1" onclick="markUtangAsLunas(${u.id})">
                                    Lunas
                                </button>
                            ` : u.status === 'lunas' ? `
                                <span class="badge bg-success mt-1">Lunas</span>
                            ` : ''}
                            <button class="btn btn-sm btn-danger mt-1" onclick="deleteUtang(${u.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== TARGET FUNCTIONS ====================
function addTarget() {
    const name = document.getElementById('targetName').value.trim();
    const amount = parseRupiah(document.getElementById('targetAmount').value);
    const priority = document.getElementById('targetPriority').value;

    if (!name || !amount || amount <= 0) {
        alert('Harap lengkapi data target!');
        return;
    }

    targets.push({
        id: Date.now(),
        name: name,
        targetAmount: amount,
        currentAmount: 0,
        priority: priority,
        status: 'active',
        dateAdded: new Date().toLocaleDateString('id-ID')
    });

    saveTargets();
    renderTargets();
    updateSummary();
    
    document.getElementById('targetName').value = '';
    document.getElementById('targetAmount').value = '';
}

function updateTargetProgress(id) {
    const newAmount = parseInt(prompt('Masukkan progress terbaru (Rp):'));
    if (isNaN(newAmount) || newAmount < 0) return;
    
    const index = targets.findIndex(t => t.id === id);
    if (index !== -1) {
        targets[index].currentAmount = newAmount;
        
        if (targets[index].currentAmount >= targets[index].targetAmount) {
            targets[index].status = 'achieved';
        }
        
        saveTargets();
        renderTargets();
        updateSummary();
    }
}

function deleteTarget(id) {
    if (confirm('Hapus target ini?')) {
        targets = targets.filter(t => t.id !== id);
        saveTargets();
        renderTargets();
        updateSummary();
    }
}

function renderTargets() {
    const container = document.getElementById('targetList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (targets.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center">Belum ada target</p>';
        return;
    }
    
    const totalWealth = calculateTotalWealth();
    
    targets.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return b.targetAmount - a.targetAmount;
    });
    
    targets.forEach(t => {
        const progress = (t.currentAmount / t.targetAmount) * 100;
        const isAchieved = t.status === 'achieved';
        const canBuy = totalWealth >= t.targetAmount && !isAchieved;
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="target-card target-priority-${t.priority}">
                    <div class="d-flex justify-content-between">
                        <div>
                            <span class="fw-bold">${t.name}</span>
                            ${canBuy ? '<span class="badge bg-success ms-2">Bisa Dibeli!</span>' : ''}
                            ${isAchieved ? '<span class="badge bg-success ms-2">Tercapai!</span>' : ''}
                            <br>
                            <small class="text-muted">Target: ${formatRupiah(t.targetAmount)}</small>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold">${progress.toFixed(1)}%</span>
                            <br>
                            <button class="btn btn-sm btn-warning btn-circle mt-1" onclick="updateTargetProgress(${t.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle mt-1" onclick="deleteTarget(${t.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="target-progress">
                        <div class="target-progress-bar ${isAchieved ? 'achieved' : ''}" 
                             style="width: ${Math.min(progress, 100)}%;"></div>
                    </div>
                    
                    <div class="d-flex justify-content-between mt-1">
                        <small class="text-muted">Terkumpul: ${formatNumber(t.currentAmount)}</small>
                        <small class="text-muted">Kurang: ${formatNumber(t.targetAmount - t.currentAmount)}</small>
                    </div>
                    <small class="text-muted d-block text-end">${formatRupiah(t.currentAmount)} / ${formatRupiah(t.targetAmount)}</small>
                </div>
            </div>
        `;
    });
}

// ==================== TRANSACTION FUNCTIONS ====================
function addTransaction() {
    const desc = document.getElementById('desc').value.trim();
    const amount = parseRupiah(document.getElementById('amount').value);
    const type = document.getElementById('type').value;

    if (!desc || !amount || amount <= 0) {
        alert('Harap lengkapi data!');
        return;
    }

    transactions.unshift({
        date: new Date().toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        desc: desc,
        amount: amount,
        type: type
    });

    saveTransactions();
    renderTable();
    updateSummary();
    
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
}

function deleteTransaction(index) {
    if (confirm('Hapus transaksi ini?')) {
        transactions.splice(index, 1);
        saveTransactions();
        renderTable();
        updateSummary();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    currentTransactionPage = 1;
    renderTable();
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function renderTable() {
    const tableBody = document.getElementById('transactionTable');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredTransactions = transactions.filter(trx => 
        trx.desc.toLowerCase().includes(searchTerm) || 
        trx.amount.toString().includes(searchTerm)
    );
    
    if (currentFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trx => trx.type === currentFilter);
    }
    
    const start = (currentTransactionPage - 1) * itemsPerPage;
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const current = filteredTransactions.slice(start, start + itemsPerPage);

    tableBody.innerHTML = '';
    
    if (current.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3">Tidak ada transaksi</td></tr>';
        return;
    }
    
    current.forEach((trx, i) => {
        const globalIndex = transactions.findIndex(t => 
            t.date === trx.date && t.desc === trx.desc && t.amount === trx.amount
        );
        
        tableBody.innerHTML += `
            <tr>
                <td>${trx.date}</td>
                <td>${trx.desc}</td>
                <td><span class="badge ${trx.type === 'pemasukan' ? 'bg-success' : 'bg-danger'}">
                    ${trx.type === 'pemasukan' ? 'Masuk' : 'Keluar'}
                </span></td>
                <td class="${trx.type === 'pemasukan' ? 'text-success-custom' : 'text-danger-custom'} fw-bold">
                    ${trx.type === 'pemasukan' ? '+' : '-'}${formatNumber(trx.amount)}
                </td>
                <td>
                    <button class="btn btn-sm btn-danger btn-circle" onclick="deleteTransaction(${globalIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    for (let i = 1; i <= totalPages; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentTransactionPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
            </li>
        `;
    }
}

function goToPage(page) {
    currentTransactionPage = page;
    renderTable();
}

// ==================== SUMMARY FUNCTIONS ====================
function calculateTotalWealth() {
    const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
    const totalCash = totalIncome - totalExpense;
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    
    const totalSaham = saham.reduce((acc, s) => acc + s.totalNilai, 0);
    const totalEmas = emas.reduce((acc, e) => acc + e.totalNilai, 0);
    const totalInvestasiLain = investasiLain.reduce((acc, i) => acc + i.totalNilai, 0);
    
    const totalUtangAktif = utang.filter(u => u.type === 'utang' && u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    const totalPiutang = utang.filter(u => u.type === 'piutang' && u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    
    const totalAset = totalCash + totalMBanking + totalSaham + totalEmas + totalInvestasiLain + totalPiutang;
    return totalAset - totalUtangAktif;
}

function updateSummary() {
    const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
    const totalCash = totalIncome - totalExpense;
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    
    const totalSaham = saham.reduce((acc, s) => acc + s.totalNilai, 0);
    const totalEmas = emas.reduce((acc, e) => acc + e.totalNilai, 0);
    const totalInvestasiLain = investasiLain.reduce((acc, i) => acc + i.totalNilai, 0);
    
    const totalUtangAktif = utang.filter(u => u.type === 'utang' && u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    const totalPiutang = utang.filter(u => u.type === 'piutang' && u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    
    const totalWealth = calculateTotalWealth();

    document.getElementById('totalIncome').innerHTML = formatNumber(totalIncome);
    document.getElementById('totalExpense').innerHTML = formatNumber(totalExpense);
    document.getElementById('totalBalance').innerHTML = formatNumber(totalCash);
    document.getElementById('totalGrand').innerHTML = formatRupiah(totalWealth);
    
    // Update health badge
    const healthBadge = document.getElementById('financialHealthBadge');
    if (totalWealth <= 0) {
        healthBadge.className = 'badge bg-danger';
        healthBadge.innerHTML = '🔴 Bangkrut';
    } else if (totalUtangAktif > totalWealth * 0.5) {
        healthBadge.className = 'badge bg-warning text-dark';
        healthBadge.innerHTML = '🟡 Waspada';
    } else {
        healthBadge.className = 'badge bg-success';
        healthBadge.innerHTML = '💚 Sehat';
    }
    
    // Investment Summary Cards
    const container = document.getElementById('investmentSummaryCards');
    if (container) {
        container.innerHTML = `
            <div class="col-4">
                <div class="summary-card">
                    <div class="label">Saham</div>
                    <div class="value text-primary">${formatNumber(totalSaham)}</div>
                    <small>${formatRupiah(totalSaham)}</small>
                </div>
            </div>
            <div class="col-4">
                <div class="summary-card">
                    <div class="label">Emas</div>
                    <div class="value text-warning">${formatNumber(totalEmas)}</div>
                    <small>${formatRupiah(totalEmas)}</small>
                </div>
            </div>
            <div class="col-4">
                <div class="summary-card">
                    <div class="label">Lainnya</div>
                    <div class="value text-info">${formatNumber(totalInvestasiLain)}</div>
                    <small>${formatRupiah(totalInvestasiLain)}</small>
                </div>
            </div>
        `;
    }
}

// ==================== SAVE FUNCTIONS ====================
function saveTransactions() { localStorage.setItem('transactions', JSON.stringify(transactions)); }
function saveMBanking() { localStorage.setItem('mbanking', JSON.stringify(mbanking)); }
function saveGajian() { localStorage.setItem('gajian', JSON.stringify(gajian)); }
function saveSaham() { localStorage.setItem('saham', JSON.stringify(saham)); }
function saveEmas() { localStorage.setItem('emas', JSON.stringify(emas)); }
function saveInvestasiLain() { localStorage.setItem('investasiLain', JSON.stringify(investasiLain)); }
function saveUtang() { localStorage.setItem('utang', JSON.stringify(utang)); }
function saveTargets() { localStorage.setItem('targets', JSON.stringify(targets)); }

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Format currency inputs
    document.querySelectorAll('.currency-input').forEach(input => {
        input.addEventListener('keyup', function() { formatCurrency(this); });
        input.addEventListener('blur', function() { formatCurrency(this); });
    });
    
    // Enter key handlers
    document.getElementById('amount')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTransaction();
    });
    
    // Render all
    renderGajian();
    renderMBanking();
    renderSaham();
    renderEmas();
    renderInvestasiLain();
    renderUtang();
    renderTargets();
    renderTable();
    updateRekeningSelect();
    updateSummary();
});
