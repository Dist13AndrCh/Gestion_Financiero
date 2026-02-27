let appData = JSON.parse(localStorage.getItem('vengeanceLedgerData')) || {
    monthlyIncome: 0,
    savingsPercent: 20,
    transactions: []
};

let fileHandle = null;

function init() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txDate').value = today;
    document.getElementById('monthlyIncomeInput').value = appData.monthlyIncome || '';
    document.getElementById('savingsPercentInput').value = appData.savingsPercent || 20;
    updateUI();
}

function saveData() {
    localStorage.setItem('vengeanceLedgerData', JSON.stringify(appData));
    updateUI();
    syncToFile();
}

function updateGoals() {
    appData.monthlyIncome = parseFloat(document.getElementById('monthlyIncomeInput').value) || 0;
    appData.savingsPercent = parseFloat(document.getElementById('savingsPercentInput').value) || 0;
    saveData();
}

function updateUI() {
    const monthlyGoal = appData.monthlyIncome * (appData.savingsPercent / 100);
    document.getElementById('monthlyGoalTarget').innerText = formatCurrency(monthlyGoal);
    document.getElementById('weeklyGoalTarget').innerText = formatCurrency(monthlyGoal / 4.33);

    const balance = appData.transactions.reduce((acc, tx) => 
        tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
    
    const balanceEl = document.getElementById('currentBalance');
    balanceEl.innerText = formatCurrency(balance);
    
    if (balance < 0) {
        balanceEl.classList.remove('text-white');
        balanceEl.classList.add('text-bat-red');
    } else {
        balanceEl.classList.add('text-white');
        balanceEl.classList.remove('text-bat-red');
    }

    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('transactionList');
    if (appData.transactions.length === 0) {
        list.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-bat-red-dim opacity-30">
            <i class="ph ph-warning-circle text-6xl mb-2"></i>
            <span class="font-mono text-xs">SIN_REGISTROS_EN_BASE_DE_DATOS</span>
        </div>`;
        return;
    }
    list.innerHTML = '';
    const sorted = [...appData.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => {
        const div = document.createElement('div');
        div.className = `tx-item p-4 border-l-2 flex justify-between items-center ${tx.type === 'income' ? 'border-l-green-600' : 'border-l-bat-red'}`;
        div.innerHTML = `
            <div class="font-mono">
                <div class="text-white text-sm font-bold tracking-tighter uppercase">${tx.desc}</div>
                <div class="text-[10px] text-bat-red-dim">${tx.date.replace(/-/g, '/')} // ID_${tx.id.toString().slice(-4)}</div>
            </div>
            <div class="flex items-center gap-6">
                <span class="font-title text-lg ${tx.type === 'income' ? 'text-green-500' : 'text-bat-red'}">
                    ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
                </span>
                <button onclick="deleteTx(${tx.id})" class="text-white/10 hover:text-bat-red transition-colors">
                    <i class="ph ph-skull"></i>
                </button>
            </div>`;
        list.appendChild(div);
    });
}

function deleteTx(id) {
    if(confirm("¿CONFIRMAR ELIMINACIÓN DE REGISTRO?")) {
        appData.transactions = appData.transactions.filter(t => t.id !== id);
        saveData();
    }
}

function openModal(type) {
    const modal = document.getElementById('transactionModal');
    const title = document.getElementById('modalTitle');
    const btn = document.getElementById('modalSubmitBtn');
    document.getElementById('txType').value = type;
    if(type === 'income') {
        title.innerText = "ENTRADA_DE_ACTIVOS";
        btn.style.borderColor = "#16a34a";
        btn.style.color = "#16a34a";
    } else {
        title.innerText = "REGISTRO_DE_BAJA";
        btn.style.borderColor = "#e61919";
        btn.style.color = "#e61919";
    }
    modal.classList.add('active');
    document.getElementById('txAmount').focus();
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const desc = document.getElementById('txDesc').value;
    const date = document.getElementById('txDate').value;
    const type = document.getElementById('txType').value;
    if (!amount || !desc || !date) return;
    appData.transactions.push({ id: Date.now(), type, amount, desc: desc.toUpperCase(), date });
    saveData();
    closeModal();
    e.target.reset();
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}

async function linkLocalFile() {
    if (!window.showSaveFilePicker) {
        alert("NAVEGADOR NO COMPATIBLE CON PROTOCOLO FS_ACCESS. USE CHROME/EDGE.");
        return;
    }
    try {
        fileHandle = await window.showSaveFilePicker({
            suggestedName: 'BAT_FINANCE_LOG.csv',
            types: [{ description: 'Registro CSV', accept: {'text/csv': ['.csv']} }]
        });
        document.getElementById('syncStatus').classList.remove('hidden');
        syncToFile();
    } catch (e) { console.warn("Operación cancelada."); }
}

async function syncToFile() {
    if (!fileHandle) return;
    try {
        const writable = await fileHandle.createWritable();
        let csv = "\uFEFFFECHA,TIPO,DESCRIPCION,MONTO_USD\n";
        appData.transactions.forEach(tx => {
            csv += `${tx.date},${tx.type === 'income' ? 'INGRESO' : 'GASTO'},"${tx.desc}",${tx.amount}\n`;
        });
        await writable.write(csv);
        await writable.close();
    } catch (err) {
        fileHandle = null;
        document.getElementById('syncStatus').classList.add('hidden');
    }
}

function exportToCSV() {
    let csv = "\uFEFFFECHA,TIPO,DESCRIPCION,MONTO_USD\n";
    appData.transactions.forEach(tx => {
        csv += `${tx.date},${tx.type},"${tx.desc}",${tx.amount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BAT_LOG_${new Date().getTime()}.csv`;
    a.click();
}

function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

window.onload = init;