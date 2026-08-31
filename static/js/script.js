let liveInterval = null;
let targetPidToKill = null;

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) selectedTab.classList.add('active');

    event.target.classList.add('active');

    if (tabName === 'overview') loadOverview();
    if (tabName === 'cpu') loadCPU();
    if (tabName === 'memory') loadMemory();
    if (tabName === 'disk') loadDisk();
    if (tabName === 'processes') loadProcesses();
    if (tabName === 'live') startLive();
    else stopLive();
}

async function loadOverview() {
    try {
        const res = await fetch('/api/live');
        const data = await res.json();

        updateMetric('ov-cpu', data.cpu.usage, data.cpu.status);
        updateMetric('ov-mem', data.memory.usage_pct, data.memory.status);
        updateMetric('ov-disk', data.disk.use_pct, data.disk.status);
    } catch (e) {
        console.error(e);
    }
}

async function loadCPU() {
    const res = await fetch('/api/cpu');
    const data = await res.json();
    document.getElementById('cpu-usage').innerText = data.usage + '%';
    document.getElementById('cpu-load').innerText = data.load_1min || 'N/A';
    document.getElementById('cpu-status').innerText = data.status;
    document.getElementById('cpu-bar').style.width = data.usage + '%';
}

async function loadMemory() {
    const res = await fetch('/api/memory');
    const data = await res.json();
    document.getElementById('mem-total').innerText = data.total_mb + ' MB';
    document.getElementById('mem-used').innerText = data.used_mb + ' MB';
    document.getElementById('mem-avail').innerText = data.avail_mb + ' MB';
    document.getElementById('mem-usage').innerText = data.usage_pct + '%';
    document.getElementById('mem-status').innerText = data.status;
    document.getElementById('mem-bar').style.width = data.usage_pct + '%';
}

async function loadDisk() {
    const res = await fetch('/api/disk');
    const data = await res.json();
    const tbody = document.getElementById('disk-body');
    tbody.innerHTML = '';

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.filesystem}</td>
                <td>${item.size}</td>
                <td>${item.used}</td>
                <td>${item.avail}</td>
                <td>${item.use_pct}%</td>
                <td>${item.mounted}</td>
                <td><span class="badge ${item.status}">${item.status}</span></td>
            </tr>
        `;
    });
}

async function loadProcesses() {
    const res = await fetch('/api/processes');
    const data = await res.json();
    const tbody = document.getElementById('process-body');
    tbody.innerHTML = '';

    data.forEach(proc => {
        tbody.innerHTML += `
            <tr>
                <td>${proc.pid}</td>
                <td>${proc.name}</td>
                <td>${proc.cpu}%</td>
                <td>${proc.mem}%</td>
                <td><button class="btn-kill" onclick="askKill(${proc.pid}, '${proc.name}')">Kill</button></td>
            </tr>
        `;
    });
}

function startLive() {
    if (!liveInterval) {
        updateLive();
        liveInterval = setInterval(updateLive, 3000);
    }
}

function stopLive() {
    if (liveInterval) {
        clearInterval(liveInterval);
        liveInterval = null;
    }
}

function toggleLive() {
    const btn = document.getElementById('live-btn');
    if (liveInterval) {
        stopLive();
        btn.innerText = '▶️ Resume';
    } else {
        startLive();
        btn.innerText = '⏸️ Pause';
    }
}

async function updateLive() {
    const res = await fetch('/api/live');
    const data = await res.json();

    document.getElementById('live-cpu').innerText = data.cpu.usage + '%';
    document.getElementById('live-cpu-bar').style.width = data.cpu.usage + '%';
    document.getElementById('live-cpu-status').innerText = data.cpu.status;

    document.getElementById('live-mem').innerText = data.memory.usage_pct + '%';
    document.getElementById('live-mem-bar').style.width = data.memory.usage_pct + '%';
    document.getElementById('live-mem-status').innerText = data.memory.status;

    document.getElementById('live-disk').innerText = data.disk.use_pct + '%';
    document.getElementById('live-disk-bar').style.width = data.disk.use_pct + '%';
    document.getElementById('live-disk-status').innerText = data.disk.status;
}

function updateMetric(prefix, usage, status) {
    document.getElementById(`${prefix}-val`).innerText = usage + '%';
    document.getElementById(`${prefix}-bar`).style.width = usage + '%';
    const badge = document.getElementById(`${prefix}-status`);
    badge.innerText = status;
    badge.className = `badge ${status}`;
}

function askKill(pid, name) {
    targetPidToKill = pid;
    document.getElementById('modal-msg').innerText = `Are you sure you want to terminate process ${name} (PID: ${pid})?`;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    targetPidToKill = null;
}

async function confirmKill() {
    if (!targetPidToKill) return;
    await fetch(`/api/kill/${targetPidToKill}`, { method: 'POST' });
    closeModal();
    loadProcesses();
}

async function generateReport() {
    const statusDiv = document.getElementById('report-status');
    statusDiv.innerText = 'Generating report...';
    window.location.href = '/api/report';
    statusDiv.innerText = 'Report downloaded successfully!';
}

// Initial load
loadOverview();