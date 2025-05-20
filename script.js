let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let currentPage = 1;

function formatRupiah(angka) {
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction() {
  const desc = document.getElementById('desc').value.trim();
  const amount = parseInt(document.getElementById('amount').value);
  const type = document.getElementById('type').value;

  if (!desc || !amount || isNaN(amount)) {
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
    desc,
    amount,
    type
  });

  saveTransactions();
  renderTable();
  document.getElementById('desc').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('desc').focus();
}

function deleteTransaction(index) {
  if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
    transactions.splice(index, 1);
    saveTransactions();
    renderTable();
  }
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
    Nominal: trx.amount,
    Keterangan: trx.type === 'pemasukan' ? '+' + trx.amount : '-' + trx.amount
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tabungan');
  XLSX.writeFile(wb, 'tabungan.xlsx');
}

function renderTable() {
  const tableBody = document.getElementById('transactionTable');
  const pagination = document.getElementById('pagination');
  const rowPerPage = parseInt(document.getElementById('rowPerPage').value);
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(trx => 
    trx.desc.toLowerCase().includes(searchTerm) || 
    trx.amount.toString().includes(searchTerm) ||
    trx.type.includes(searchTerm) ||
    trx.date.toLowerCase().includes(searchTerm)
  );
  
  const totalPages = Math.ceil(filteredTransactions.length / rowPerPage);
  const start = (currentPage - 1) * rowPerPage;
  const current = filteredTransactions.slice(start, start + rowPerPage);

  tableBody.innerHTML = '';
  
  if (current.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="fas fa-info-circle fa-2x mb-2"></i>
          <p>Tidak ada data transaksi</p>
        </td>
      </tr>
    `;
  } else {
    current.forEach((trx, i) => {
      const isIncome = trx.type === 'pemasukan';
      tableBody.innerHTML += `
        <tr>
          <td>${trx.date}</td>
          <td>${trx.desc}</td>
          <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
            <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} me-1"></i>
            ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
          </span></td>
          <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
            ${isIncome ? '+' : '-'}Rp ${formatRupiah(trx.amount)}
          </td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${transactions.indexOf(trx)})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    });
  }

  // Pagination
  pagination.innerHTML = '';
  if (totalPages > 1) {
    pagination.innerHTML += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1})">
          <i class="fas fa-chevron-left"></i>
        </a>
      </li>
    `;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      pagination.innerHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="goToPage(1)">1</a>
        </li>
        ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
      `;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pagination.innerHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
        </li>
      `;
    }
    
    if (endPage < totalPages) {
      pagination.innerHTML += `
        ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
        <li class="page-item">
          <a class="page-link" href="#" onclick="goToPage(${totalPages})">${totalPages}</a>
        </li>
      `;
    }
    
    // Next button
    pagination.innerHTML += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1})">
          <i class="fas fa-chevron-right"></i>
        </a>
      </li>
    `;
  }

  updateSummary();
}

function goToPage(page) {
  if (page < 1 || page > Math.ceil(transactions.length / parseInt(document.getElementById('rowPerPage').value))) return;
  currentPage = page;
  renderTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSummary() {
  const totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
  const total = totalIncome - totalExpense;

  document.getElementById('totalIncome').textContent = `Rp ${formatRupiah(totalIncome)}`;
  document.getElementById('totalExpense').textContent = `Rp ${formatRupiah(totalExpense)}`;
  document.getElementById('totalTabungan').textContent = `Rp ${formatRupiah(total)}`;
  document.getElementById('totalBalance').textContent = `Rp ${formatRupiah(total)}`;
}

document.addEventListener('DOMContentLoaded', function() {
  renderTable();

  document.getElementById('amount').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addTransaction();
    }
  });
});