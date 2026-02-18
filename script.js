// Data storage
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let mbanking = JSON.parse(localStorage.getItem('mbanking') || '[]');
let investments = JSON.parse(localStorage.getItem('investments') || '[]');
let utang = JSON.parse(localStorage.getItem('utang') || '[]');
let targets = JSON.parse(localStorage.getItem('targets') || '[]');
let investmentTypes = JSON.parse(localStorage.getItem('investmentTypes') || '["emas", "saham"]');

// UI State
let currentPage = 1;
let currentFilter = 'all';
let currentBankFilter = 'all';
let currentInvestmentFilter = 'all';
let currentSortInvestment = 'name';
let currentUtangFilter = 'all';
let currentTargetFilter = 'all';
let currentTargetSort = 'progress';

// ==================== UTILITY FUNCTIONS ====================
function formatRupiah(angka) {
    if (!angka) return '0';
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(value) {
    if (!value) return 0;
    return parseInt(value.toString().replace(/\./g, '')) || 0;
}

function formatCurrency(input, blur = false) {
    let value = input.value.replace(/\./g, '');
    value = value.replace(/[^0-9]/g, '');
    
    if (value === '') {
        input.value = '';
        return;
    }
    
    let num = parseInt(value);
    if (!isNaN(num)) {
        input.value = formatRupiah(num);
        if (blur && num === 0) {
            input.value = '';
        }
    }
}

function getNumericValue(input) {
    return parseRupiah(input.value);
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveMBanking() {
    localStorage.setItem('mbanking', JSON.stringify(mbanking));
}

function saveInvestments() {
    localStorage.setItem('investments', JSON.stringify(investments));
}

function saveUtang() {
    localStorage.setItem('utang', JSON.stringify(utang));
}

function saveTargets() {
    localStorage.setItem('targets', JSON.stringify(targets));
}

function saveInvestmentTypes() {
    localStorage.setItem('investmentTypes', JSON.stringify(investmentTypes));
}

// ==================== FINANCIAL HEALTH FUNCTIONS ====================
function calculateFinancialHealth() {
    const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
    const totalCash = totalIncome - totalExpense;
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    const totalInvestments = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
    const totalUtangAktif = utang.filter(u => u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    
    const totalAset = totalCash + totalMBanking + totalInvestments;
    const totalWealth = totalAset - totalUtangAktif;
    
    // Hitung rasio utang terhadap aset
    const debtRatio = totalAset > 0 ? (totalUtangAktif / totalAset) * 100 : 100;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
    
    let healthStatus = {
        text: '',
        class: '',
        detail: ''
    };
    
    if (totalWealth <= 0) {
        healthStatus = {
            text: '🔴 Bangkrut',
            class: 'bg-danger',
            detail: 'Utang melebihi aset'
        };
    } else if (debtRatio > 70) {
        healthStatus = {
            text: '🔴 Terlilit Utang',
            class: 'bg-danger',
            detail: 'Utang sangat tinggi'
        };
    } else if (debtRatio > 50) {
        healthStatus = {
            text: '🟠 Waspada',
            class: 'bg-warning text-dark',
            detail: 'Utang cukup tinggi'
        };
    } else if (expenseRatio > 90) {
        healthStatus = {
            text: '🟡 Boros',
            class: 'bg-warning text-dark',
            detail: 'Pengeluaran hampir melebihi pemasukan'
        };
    } else if (expenseRatio > 70) {
        healthStatus = {
            text: '🟢 Cukup',
            class: 'bg-info',
            detail: 'Pengeluaran terkendali'
        };
    } else {
        healthStatus = {
            text: '💚 Sehat',
            class: 'bg-success',
            detail: 'Kondisi keuangan sangat baik'
        };
    }
    
    return healthStatus;
}

function updateFinancialHealthBadge() {
    const health = calculateFinancialHealth();
    const badge = document.getElementById('financialHealthBadge');
    const detailBadge = document.getElementById('financialDetailBadge');
    
    if (badge) {
        badge.className = `badge ${health.class}`;
        badge.innerHTML = health.text;
    }
    
    if (detailBadge) {
        detailBadge.className = `badge ${health.class}`;
        detailBadge.innerHTML = health.detail;
    }
}

// ==================== TARGET FUNCTIONS ====================
function addTarget() {
    const name = document.getElementById('targetName').value.trim();
    const amount = getNumericValue(document.getElementById('targetAmount'));
    const priority = document.getElementById('targetPriority').value;

    if (!name || !amount || amount <= 0) {
        alert('Harap lengkapi data target dengan benar!');
        return;
    }

    const now = new Date();
    targets.push({
        id: Date.now(),
        name: name,
        targetAmount: amount,
        currentAmount: 0,
        priority: priority,
        status: 'active',
        dateAdded: now.toLocaleDateString('id-ID'),
        lastUpdate: now.toLocaleDateString('id-ID')
    });

    saveTargets();
    filterTargets();
    updateSummary();
    
    // Reset form
    document.getElementById('targetName').value = '';
    document.getElementById('targetAmount').value = '';
}

function updateTargetProgress(id) {
    const newAmount = parseInt(prompt('Masukkan progress terbaru (Rp):'));
    if (isNaN(newAmount) || newAmount < 0) return;
    
    const index = targets.findIndex(t => t.id === id);
    if (index !== -1) {
        targets[index].currentAmount = newAmount;
        targets[index].lastUpdate = new Date().toLocaleDateString('id-ID');
        
        // Cek apakah target tercapai
        if (targets[index].currentAmount >= targets[index].targetAmount) {
            targets[index].status = 'achieved';
            targets[index].dateAchieved = new Date().toLocaleDateString('id-ID');
        } else {
            targets[index].status = 'active';
        }
        
        saveTargets();
        filterTargets();
        updateSummary();
    }
}

function deleteTarget(id) {
    if (confirm('Apakah Anda yakin ingin menghapus target ini?')) {
        targets = targets.filter(t => t.id !== id);
        saveTargets();
        filterTargets();
        updateSummary();
    }
}

function filterTargets() {
    currentTargetFilter = document.getElementById('filterTarget').value;
    currentTargetSort = document.getElementById('sortTarget').value;
    renderTargets();
}

function renderTargets() {
    const container = document.getElementById('targetList');
    if (!container) return;
    
    // Filter targets
    let filteredTargets = targets;
    if (currentTargetFilter === 'achieved') {
        filteredTargets = targets.filter(t => t.status === 'achieved');
    } else if (currentTargetFilter === 'notachieved') {
        filteredTargets = targets.filter(t => t.status === 'active');
    }
    
    // Sort targets
    if (currentTargetSort === 'progress') {
        filteredTargets.sort((a, b) => {
            const progressA = (a.currentAmount / a.targetAmount) * 100;
            const progressB = (b.currentAmount / b.targetAmount) * 100;
            return progressB - progressA;
        });
    } else if (currentTargetSort === 'name') {
        filteredTargets.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentTargetSort === 'amount') {
        filteredTargets.sort((a, b) => b.targetAmount - a.targetAmount);
    }
    
    container.innerHTML = '';
    
    if (filteredTargets.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted text-center small">Belum ada target</p></div>';
        return;
    }
    
    // Hitung total kekayaan bersih untuk cek target
    const totalCash = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0) - 
                     transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    const totalInvestments = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
    const totalUtangAktif = utang.filter(u => u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    const totalWealth = totalCash + totalMBanking + totalInvestments - totalUtangAktif;
    
    filteredTargets.forEach(t => {
        const progress = (t.currentAmount / t.targetAmount) * 100;
        const isAchieved = t.status === 'achieved';
        const canBuy = totalWealth >= t.targetAmount && !isAchieved;
        
        // Warna berdasarkan prioritas
        let priorityColor = '';
        if (t.priority === 'high') priorityColor = '#e74c3c';
        else if (t.priority === 'medium') priorityColor = '#f39c12';
        else priorityColor = '#3498db';
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="card ${isAchieved ? 'border-success' : ''} mb-2">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">
                                    ${t.name}
                                    ${canBuy ? '<span class="badge bg-success ms-2"><i class="fas fa-check-circle"></i> Dapat Dibeli!</span>' : ''}
                                    ${isAchieved ? '<span class="badge bg-success ms-2"><i class="fas fa-trophy"></i> Tercapai!</span>' : ''}
                                </h6>
                                <small class="text-muted">
                                    <span class="badge" style="background-color: ${priorityColor}20; color: ${priorityColor}">
                                        ${t.priority === 'high' ? 'Prioritas Tinggi' : t.priority === 'medium' ? 'Prioritas Sedang' : 'Prioritas Rendah'}
                                    </span>
                                </small>
                                <br>
                                <small class="text-muted">Target: Rp ${formatRupiah(t.targetAmount)}</small>
                                <br>
                                <small class="text-muted">Terkumpul: Rp ${formatRupiah(t.currentAmount)}</small>
                            </div>
                            <div class="text-end">
                                <h6 class="${isAchieved ? 'text-success' : 'text-primary'} fw-bold">
                                    ${progress.toFixed(1)}%
                                </h6>
                                <div class="mt-1">
                                    <button class="btn btn-sm btn-warning btn-circle" onclick="updateTargetProgress(${t.id})" title="Update Progress">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-circle" onclick="deleteTarget(${t.id})" title="Hapus">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar dengan Persentase -->
                        <div class="progress mt-2" style="height: 10px;">
                            <div class="progress-bar ${isAchieved ? 'bg-success' : (progress >= 100 ? 'bg-success' : 'bg-primary')}" 
                                 role="progressbar" 
                                 style="width: ${Math.min(progress, 100)}%;" 
                                 aria-valuenow="${Math.min(progress, 100)}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${progress >= 10 ? progress.toFixed(1) + '%' : ''}
                            </div>
                        </div>
                        
                        <!-- Info Tambahan -->
                        <div class="d-flex justify-content-between mt-1">
                            <small class="text-muted">Ditambahkan: ${t.dateAdded}</small>
                            ${!isAchieved ? `
                                <small class="text-${canBuy ? 'success' : 'muted'} fw-bold">
                                    ${canBuy ? '<i class="fas fa-check-circle"></i> Dana cukup!' : 'Kurang: Rp ' + formatRupiah(t.targetAmount - t.currentAmount)}
                                </small>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Update total target display
    const totalTarget = targets.reduce((acc, t) => acc + t.targetAmount, 0);
    document.getElementById('totalTargetDisplay').textContent = `Total Target: Rp ${formatRupiah(totalTarget)}`;
}

// ==================== UTANG FUNCTIONS ====================
function addUtang() {
    const name = document.getElementById('utangName').value.trim();
    const amount = getNumericValue(document.getElementById('utangAmount'));
    const dueDate = document.getElementById('utangDueDate').value;

    if (!name || !amount || amount <= 0) {
        alert('Harap lengkapi data utang dengan benar!');
        return;
    }

    const now = new Date();
    utang.push({
        id: Date.now(),
        name: name,
        amount: amount,
        dueDate: dueDate || 'Tanpa jatuh tempo',
        status: 'active',
        dateAdded: now.toLocaleDateString('id-ID'),
        lastUpdate: now.toLocaleDateString('id-ID')
    });

    saveUtang();
    filterUtang();
    updateSummary();
    
    // Reset form
    document.getElementById('utangName').value = '';
    document.getElementById('utangAmount').value = '';
    document.getElementById('utangDueDate').value = '';
}

function markUtangAsLunas(id) {
    if (confirm('Tandai utang ini sebagai lunas?')) {
        const index = utang.findIndex(u => u.id === id);
        if (index !== -1) {
            utang[index].status = 'lunas';
            utang[index].dateLunas = new Date().toLocaleDateString('id-ID');
            utang[index].lastUpdate = new Date().toLocaleDateString('id-ID');
            saveUtang();
            filterUtang();
            updateSummary();
        }
    }
}

function deleteUtang(id) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan utang ini?')) {
        utang = utang.filter(u => u.id !== id);
        saveUtang();
        filterUtang();
        updateSummary();
    }
}

function filterUtang() {
    currentUtangFilter = document.getElementById('filterUtang').value;
    renderUtang();
}

function renderUtang() {
    const container = document.getElementById('utangList');
    if (!container) return;
    
    // Filter utang
    let filteredUtang = utang;
    if (currentUtangFilter === 'active') {
        filteredUtang = utang.filter(u => u.status === 'active');
    } else if (currentUtangFilter === 'lunas') {
        filteredUtang = utang.filter(u => u.status === 'lunas');
    }
    
    // Urutkan: yang aktif di atas, lalu tenggat waktu terdekat
    filteredUtang.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    container.innerHTML = '';
    
    if (filteredUtang.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted text-center small">Belum ada catatan utang</p></div>';
        return;
    }
    
    filteredUtang.forEach(u => {
        const isActive = u.status === 'active';
        const cardClass = isActive ? 'border-danger' : 'border-success';
        
        // Cek jatuh tempo
        const today = new Date();
        const due = new Date(u.dueDate);
        const isOverdue = isActive && u.dueDate !== 'Tanpa jatuh tempo' && due < today;
        
        container.innerHTML += `
            <div class="col-12 col-md-6">
                <div class="card ${cardClass} mb-2">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${u.name}</h6>
                                <small class="text-muted">Ditambahkan: ${u.dateAdded}</small>
                                ${u.dueDate !== 'Tanpa jatuh tempo' ? `
                                    <br><small class="${isOverdue ? 'text-danger fw-bold' : 'text-muted'}">
                                        <i class="fas fa-calendar-alt me-1"></i>Jatuh tempo: ${u.dueDate}
                                        ${isOverdue ? ' (Terlewat)' : ''}
                                    </small>
                                ` : ''}
                                ${u.status === 'lunas' ? `
                                    <br><small class="text-success">Lunas: ${u.dateLunas}</small>
                                ` : ''}
                            </div>
                            <div class="text-end">
                                <h6 class="${isActive ? 'text-danger' : 'text-success'} fw-bold">
                                    Rp ${formatRupiah(u.amount)}
                                </h6>
                                <div class="mt-1">
                                    ${isActive ? `
                                        <button class="btn btn-sm btn-success btn-circle" onclick="markUtangAsLunas(${u.id})" title="Tandai Lunas">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger btn-circle" onclick="deleteUtang(${u.id})" title="Hapus">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="progress mt-2" style="height: 5px;">
                            <div class="progress-bar ${isActive ? 'bg-danger' : 'bg-success'}" style="width: 100%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Update total display
    const totalUtangAktif = utang.filter(u => u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    const totalUtangLunas = utang.filter(u => u.status === 'lunas').reduce((acc, u) => acc + u.amount, 0);
    
    document.getElementById('totalUtangDisplay').textContent = `Total Utang Aktif: Rp ${formatRupiah(totalUtangAktif)}`;
    document.getElementById('totalUtangAktif').textContent = `Rp ${formatRupiah(totalUtangAktif)}`;
    document.getElementById('totalUtangLunas').textContent = `Rp ${formatRupiah(totalUtangLunas)}`;
}

// ==================== M-BANKING FUNCTIONS ====================
function getBankClass(bankName) {
    const bankClasses = {
        'BCA': 'bank-bca',
        'Mandiri': 'bank-mandiri',
        'BRI': 'bank-bri',
        'BNI': 'bank-bni',
        'CIMB Niaga': 'bank-cimb',
        'Danamon': 'bank-danamon',
        'Permata': 'bank-permata',
        'Maybank': 'bank-maybank',
        'Bank Lain': 'bank-lain'
    };
    return bankClasses[bankName] || 'bank-lain';
}

function addMBanking() {
    const bankName = document.getElementById('bankSelect').value;
    const saldo = getNumericValue(document.getElementById('mbankingSaldo'));

    if (!saldo || saldo <= 0) {
        alert('Harap masukkan saldo dengan benar!');
        return;
    }

    const existingBank = mbanking.find(m => m.bankName === bankName);
    
    if (existingBank) {
        if (confirm(`Bank ${bankName} sudah ada dengan saldo Rp ${formatRupiah(existingBank.saldo)}. Update saldo?`)) {
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
    filterMBanking();
    updateSummary();
    document.getElementById('mbankingSaldo').value = '';
}

function updateMBankingSaldo(id) {
    const newSaldo = parseInt(prompt('Masukkan saldo terbaru:'));
    if (isNaN(newSaldo) || newSaldo < 0) return;
    
    const index = mbanking.findIndex(m => m.id === id);
    if (index !== -1) {
        mbanking[index].saldo = newSaldo;
        mbanking[index].lastUpdate = new Date().toLocaleDateString('id-ID');
        saveMBanking();
        filterMBanking();
        updateSummary();
    }
}

function deleteMBanking(id) {
    if (confirm('Apakah Anda yakin ingin menghapus akun M-Banking ini?')) {
        mbanking = mbanking.filter(m => m.id !== id);
        saveMBanking();
        filterMBanking();
        updateSummary();
    }
}

function filterMBanking() {
    currentBankFilter = document.getElementById('filterBank').value;
    renderMBanking();
}

function renderMBanking() {
    const container = document.getElementById('mbankingList');
    if (!container) return;
    
    // Filter banks
    let filteredBanks = mbanking;
    if (currentBankFilter !== 'all') {
        filteredBanks = mbanking.filter(m => m.bankName === currentBankFilter);
    }
    
    container.innerHTML = '';
    
    if (filteredBanks.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted text-center small">Belum ada akun M-Banking</p></div>';
        return;
    }
    
    filteredBanks.forEach(m => {
        const bankClass = getBankClass(m.bankName);
        container.innerHTML += `
            <div class="col-12 col-sm-6 col-lg-4">
                <div class="bank-item ${bankClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-2"><i class="fas fa-university me-2"></i>${m.bankName}</h6>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-light btn-circle" onclick="updateMBankingSaldo(${m.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle" onclick="deleteMBanking(${m.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="saldo">
                        Rp ${formatRupiah(m.saldo)}
                    </div>
                    <small>Update: ${m.lastUpdate}</small>
                </div>
            </div>
        `;
    });
    
    // Update total display
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    document.getElementById('totalMBankingDisplay').textContent = `Total: Rp ${formatRupiah(totalMBanking)}`;
}

// ==================== INVESTMENT FUNCTIONS ====================
function addInvestmentType() {
    const newType = prompt('Masukkan nama jenis investasi baru:');
    if (newType && newType.trim() !== '') {
        const typeId = newType.toLowerCase().replace(/\s+/g, '');
        if (!investmentTypes.includes(typeId)) {
            investmentTypes.push(typeId);
            saveInvestmentTypes();
            updateInvestmentSelects();
            filterInvestments();
            alert(`Jenis investasi "${newType}" berhasil ditambahkan!`);
        } else {
            alert('Jenis investasi sudah ada!');
        }
    }
}

function updateInvestmentSelects() {
    const typeSelect = document.getElementById('investmentType');
    if (typeSelect) {
        typeSelect.innerHTML = '';
        investmentTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            typeSelect.appendChild(option);
        });
    }
    
    const filterSelect = document.getElementById('filterInvestmentType');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">Semua</option>';
        investmentTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            filterSelect.appendChild(option);
        });
    }
}

function addInvestment() {
    const type = document.getElementById('investmentType').value;
    const name = document.getElementById('investmentName').value.trim();
    const value = getNumericValue(document.getElementById('investmentValue'));
    const quantity = parseFloat(document.getElementById('investmentQuantity').value) || 1;

    if (!name || !value || value <= 0) {
        alert('Harap lengkapi data investasi dengan benar!');
        return;
    }

    investments.push({
        id: Date.now(),
        type: type,
        name: name,
        value: value,
        quantity: quantity,
        totalValue: value * quantity,
        date: new Date().toLocaleDateString('id-ID'),
        lastUpdate: new Date().toLocaleDateString('id-ID')
    });

    saveInvestments();
    filterInvestments();
    updateSummary();
    
    document.getElementById('investmentName').value = '';
    document.getElementById('investmentValue').value = '';
    document.getElementById('investmentQuantity').value = '1';
}

function deleteInvestment(id) {
    if (confirm('Apakah Anda yakin ingin menghapus investasi ini?')) {
        investments = investments.filter(inv => inv.id !== id);
        saveInvestments();
        filterInvestments();
        updateSummary();
    }
}

function updateInvestmentValue(id) {
    const newValue = parseInt(prompt('Masukkan nilai terbaru per unit:'));
    if (isNaN(newValue) || newValue < 0) return;
    
    const index = investments.findIndex(inv => inv.id === id);
    if (index !== -1) {
        investments[index].value = newValue;
        investments[index].totalValue = newValue * investments[index].quantity;
        investments[index].lastUpdate = new Date().toLocaleDateString('id-ID');
        saveInvestments();
        filterInvestments();
        updateSummary();
    }
}

function filterInvestments() {
    currentInvestmentFilter = document.getElementById('filterInvestmentType').value;
    currentSortInvestment = document.getElementById('sortInvestment').value;
    renderInvestments();
}

function renderInvestments() {
    const container = document.getElementById('investmentList');
    if (!container) return;
    
    // Filter investments
    let filteredInvestments = investments;
    if (currentInvestmentFilter !== 'all') {
        filteredInvestments = investments.filter(inv => inv.type === currentInvestmentFilter);
    }
    
    // Sort investments
    if (currentSortInvestment === 'name') {
        filteredInvestments.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentSortInvestment === 'value') {
        filteredInvestments.sort((a, b) => b.totalValue - a.totalValue);
    } else if (currentSortInvestment === 'type') {
        filteredInvestments.sort((a, b) => a.type.localeCompare(b.type));
    }
    
    container.innerHTML = '';
    
    if (filteredInvestments.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted text-center small">Belum ada data investasi</p></div>';
        return;
    }
    
    const colors = ['#4361ee', '#f72585', '#4cc9f0', '#f9c74f', '#7209b7'];
    
    filteredInvestments.forEach(inv => {
        const colorIndex = investmentTypes.indexOf(inv.type) % colors.length;
        
        container.innerHTML += `
            <div class="col-12 col-sm-6 col-lg-4">
                <div class="investment-card" style="border-left-color: ${colors[colorIndex]}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${inv.name}</h6>
                            <small class="text-muted">${inv.type} · ${inv.quantity} unit</small>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-warning btn-circle" onclick="updateInvestmentValue(${inv.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-circle" onclick="deleteInvestment(${inv.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <small>@ Rp ${formatRupiah(inv.value)}</small>
                        <span class="price">Rp ${formatRupiah(inv.totalValue)}</span>
                    </div>
                    <small class="text-muted d-block mt-1">Update: ${inv.lastUpdate}</small>
                </div>
            </div>
        `;
    });
    
    // Update total display
    const totalInvestments = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
    document.getElementById('totalInvestmentsDisplay').textContent = `Total: Rp ${formatRupiah(totalInvestments)}`;
}

function renderInvestmentSummaryCards() {
    const container = document.getElementById('investmentSummaryCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    investmentTypes.forEach(type => {
        const total = investments.filter(inv => inv.type === type)
            .reduce((acc, inv) => acc + inv.totalValue, 0);
        
        const colors = {
            'emas': '#ffd700',
            'saham': '#00b4d8'
        };
        const color = colors[type] || '#7209b7';
        
        container.innerHTML += `
            <div class="col-6 col-md-3">
                <div class="card summary-card h-100" style="border-left-color: ${color}">
                    <div class="card-body p-2 p-md-3">
                        <h6 class="card-title small"><i class="fas fa-chart-line me-1" style="color: ${color}"></i>${type.charAt(0).toUpperCase() + type.slice(1)}</h6>
                        <p class="card-text fs-6 fs-md-5 fw-bold mb-0" id="total${type.charAt(0).toUpperCase() + type.slice(1)}">Rp ${formatRupiah(total)}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==================== TRANSACTION FUNCTIONS ====================
function addTransaction() {
    const desc = document.getElementById('desc').value.trim();
    const amount = getNumericValue(document.getElementById('amount'));
    const type = document.getElementById('type').value;

    if (!desc || !amount || amount <= 0) {
        alert('Harap lengkapi semua data dengan benar!');
        return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    transactions.unshift({
        date: formattedDate,
        desc: desc,
        amount: amount,
        type: type
    });

    saveTransactions();
    renderTable();
    updateSummary();
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('desc').focus();
}

function deleteTransaction(index) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transactions.splice(index, 1);
        saveTransactions();
        renderTable();
        updateSummary();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    renderTable();
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (filter === 'all') document.getElementById('filterAll').classList.add('active');
    else if (filter === 'pemasukan') document.getElementById('filterIncome').classList.add('active');
    else document.getElementById('filterExpense').classList.add('active');
}

function renderTable() {
    const tableBody = document.getElementById('transactionTable');
    const pagination = document.getElementById('pagination');
    const rowPerPage = parseInt(document.getElementById('rowPerPage').value);
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredTransactions = transactions.filter(trx => 
        trx.desc.toLowerCase().includes(searchTerm) || 
        trx.amount.toString().includes(searchTerm) ||
        trx.type.includes(searchTerm) ||
        trx.date.toLowerCase().includes(searchTerm)
    );
    
    if (currentFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(trx => trx.type === currentFilter);
    }
    
    const totalPages = Math.ceil(filteredTransactions.length / rowPerPage);
    const start = (currentPage - 1) * rowPerPage;
    const current = filteredTransactions.slice(start, start + rowPerPage);

    tableBody.innerHTML = '';
    
    if (current.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-3 text-muted small">
                    <i class="fas fa-info-circle"></i> Tidak ada data transaksi
                </td>
            </tr>
        `;
    } else {
        current.forEach((trx, i) => {
            const isIncome = trx.type === 'pemasukan';
            const globalIndex = transactions.findIndex(t => 
                t.date === trx.date && t.desc === trx.desc && t.amount === trx.amount
            );
            
            tableBody.innerHTML += `
                <tr>
                    <td>${trx.date}</td>
                    <td>${trx.desc}</td>
                    <td><span class="${isIncome ? 'badge-income' : 'badge-expense'}">
                        ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
                    </span></td>
                    <td class="${isIncome ? 'text-success-custom' : 'text-danger-custom'} fw-bold">
                        ${isIncome ? '+' : '-'}Rp ${formatRupiah(trx.amount)}
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${globalIndex})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous
    pagination.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pagination.innerHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagination.innerHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    // Next
    pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
}

function goToPage(page) {
    const rowPerPage = parseInt(document.getElementById('rowPerPage').value);
    const filteredCount = transactions.filter(trx => {
        if (currentFilter !== 'all' && trx.type !== currentFilter) return false;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        return trx.desc.toLowerCase().includes(searchTerm) || 
               trx.amount.toString().includes(searchTerm) ||
               trx.type.includes(searchTerm) ||
               trx.date.toLowerCase().includes(searchTerm);
    }).length;
    
    const totalPages = Math.ceil(filteredCount / rowPerPage);
    
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exportToExcel() {
    if (transactions.length === 0) {
        alert('Tidak ada data untuk diexport!');
        return;
    }
    
    const data = transactions.map(trx => ({
        Tanggal: trx.date,
        Deskripsi: trx.desc,
        Jenis: trx.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        Nominal: trx.amount
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabungan');
    XLSX.writeFile(wb, 'tabungan.xlsx');
}

// ==================== SUMMARY FUNCTIONS ====================
function updateSummary() {
    const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
    const totalCash = totalIncome - totalExpense;
    const totalMBanking = mbanking.reduce((acc, m) => acc + m.saldo, 0);
    const totalInvestments = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
    const totalUtangAktif = utang.filter(u => u.status === 'active').reduce((acc, u) => acc + u.amount, 0);
    
    const totalAset = totalCash + totalMBanking + totalInvestments;
    const totalWealth = totalAset - totalUtangAktif;

    document.getElementById('totalIncome').textContent = `Rp ${formatRupiah(totalIncome)}`;
    document.getElementById('totalExpense').textContent = `Rp ${formatRupiah(totalExpense)}`;
    document.getElementById('totalBalance').textContent = `Rp ${formatRupiah(totalCash)}`;
    document.getElementById('totalTabungan').textContent = `Rp ${formatRupiah(totalWealth)}`;
    document.getElementById('totalGrand').textContent = `Rp ${formatRupiah(totalWealth)}`;
    
    investmentTypes.forEach(type => {
        const total = investments.filter(inv => inv.type === type).reduce((acc, inv) => acc + inv.totalValue, 0);
        const element = document.getElementById(`total${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (element) {
            element.textContent = `Rp ${formatRupiah(total)}`;
        }
    });
    
    renderInvestmentSummaryCards();
    updateFinancialHealthBadge();
    renderTargets(); // Re-render targets untuk update badge "Dapat Dibeli"
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    renderTable();
    renderMBanking();
    renderInvestments();
    renderUtang();
    renderTargets();
    updateInvestmentSelects();
    renderInvestmentSummaryCards();
    updateSummary();

    document.getElementById('amount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTransaction();
    });
    
    document.getElementById('mbankingSaldo').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addMBanking();
    });
    
    document.getElementById('utangAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addUtang();
    });
    
    document.getElementById('targetAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTarget();
    });
    
    // Fix for mobile 100vh issue
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});
