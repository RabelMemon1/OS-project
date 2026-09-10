// ===================================================
// SYSMONITOR - Main JavaScript File
// ===================================================

let liveInterval = null;
let overviewInterval = null;
let cpuAutoInterval = null;
let memAutoInterval = null;
let targetPidToKill = null;

// Charts
let cpuChart = null;
let memChart = null;
let cpuChartLabels = [];
let cpuChartData = [];
let memChartLabels = [];
let memChartData = [];

// ===================================================
// TAB SWITCHING
// ===================================================
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) selectedTab.classList.add('active');
    event.target.classList.add('active');

    stopLive();
    stopOverviewRefresh();
    stopCPUAuto();
    stopMemAuto();

    if (tabName === 'overview') { loadOverview(); startOverviewRefresh(); }
    if (tabName === 'cpu') { loadCPU(); cpuAutoInterval = setInterval(loadCPU, 5000); }
    if (tabName === 'memory') { loadMemory(); memAutoInterval = setInterval(loadMemory, 5000); }
    if (tabName === 'disk') loadDisk();
    if (tabName === 'processes') loadProcesses();
    if (tabName === 'live') startLive();
}

// ===================================================
// STOP INTERVALS
// ===================================================
function stopOverviewRefresh() {
    if (overviewInterval) { clearInterval(overviewInterval); overviewInterval = null; }
}
function stopCPUAuto() {
    if (cpuAutoInterval) { clearInterval(cpuAutoInterval); cpuAutoInterval = null; }
}
function stopMemAuto() {
    if (memAutoInterval) { clearInterval(memAutoInterval); memAutoInterval = null; }
}
function stopLive() {
    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
}

// ===================================================
// START OVERVIEW REFRESH
// ===================================================
function startOverviewRefresh() {
    overviewInterval = setInterval(loadOverview, 5000);
}

// ===================================================
// BAR & BADGE HELPERS
// ===================================================
function setBar(id, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = pct + '%';
    el.style.background =
        pct >= 85 ? '#ff4444' :
            pct >= 70 ? '#ffcc00' : '#00d4ff';
}

function updateMetric(prefix, usage, status) {
    const val = document.getElementById(`${prefix}-val`);
    const badge = document.getElementById(`${prefix}-status`);
    if (val) val.innerText = usage + '%';
    setBar(`${prefix}-bar`, usage);
    if (badge) { badge.innerText = status; badge.className = 'badge ' + status.toLowerCase(); }
}

// ===================================================
// CHART FACTORY — animated, real-time style
// ===================================================
function createChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '30',
                borderWidth: 2.5,
                pointRadius: (ctx) => {
                    const last = ctx.dataset.data.length - 1;
                    return ctx.dataIndex === last ? 6 : 3;
                },
                pointBackgroundColor: (ctx) => {
                    const last = ctx.dataset.data.length - 1;
                    return ctx.dataIndex === last ? '#ffffff' : color;
                },
                pointBorderColor: color,
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#aaa',
                        callback: val => val + '%',
                        stepSize: 10
                    },
                    grid: { color: '#2a2d3e' }
                },
                x: {
                    ticks: {
                        color: '#888',
                        maxRotation: 30,
                        font: { size: 10 }
                    },
                    grid: { color: '#2a2d3e' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ccc', font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y}%`
                    }
                }
            }
        }
    });
}

function pushToChart(chart, labels, dataArr, newValue) {
    const now = new Date().toLocaleTimeString();
    labels.push(now);
    dataArr.push(newValue);
    if (labels.length > 10) { labels.shift(); dataArr.shift(); }
    chart.data.labels = labels;
    chart.data.datasets[0].data = dataArr;
    chart.update();
}

// ===================================================
// OVERVIEW TAB
// ===================================================
async function loadOverview() {
    try {
        const res = await fetch('/api/live');
        const data = await res.json();
        updateMetric('ov-cpu', data.cpu.usage, data.cpu.status);
        updateMetric('ov-mem', data.memory.usage_pct, data.memory.status);
        updateMetric('ov-disk', data.disk.use_pct, data.disk.status);
        const el = document.getElementById('overview-last-updated');
        if (el) el.innerText = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (e) { console.error('Overview error:', e); }
}

// ===================================================
// CPU TAB
// ===================================================
async function loadCPU() {
    try {
        const res = await fetch('/api/cpu');
        const data = await res.json();

        document.getElementById('cpu-usage').innerText = data.usage + '%';
        document.getElementById('cpu-load').innerText = data.load_1min || 'N/A';
        document.getElementById('cpu-status').innerText = data.status;
        setBar('cpu-bar', data.usage);

        if (!cpuChart) cpuChart = createChart('cpuChart', 'CPU Usage %', '#00d4ff');
        if (cpuChart) pushToChart(cpuChart, cpuChartLabels, cpuChartData, data.usage);

        const cur = document.getElementById('cpu-current');
        if (cur) {
            cur.innerText = data.usage + '%';
            cur.style.color =
                data.usage >= 85 ? '#ff4444' :
                    data.usage >= 70 ? '#ffcc00' : '#00d4ff';
        }
    } catch (err) { console.error('CPU error:', err); }
}

// ===================================================
// MEMORY TAB
// ===================================================
async function loadMemory() {
    try {
        const res = await fetch('/api/memory');
        const data = await res.json();

        document.getElementById('mem-total').innerText = (data.total_mb / 1024).toFixed(1) + ' GB';
        document.getElementById('mem-used').innerText = (data.used_mb / 1024).toFixed(1) + ' GB';
        document.getElementById('mem-avail').innerText = (data.avail_mb / 1024).toFixed(1) + ' GB';
        document.getElementById('mem-usage').innerText = data.usage_pct + '%';
        document.getElementById('mem-status').innerText = data.status;
        setBar('mem-bar', data.usage_pct);

        if (!memChart) memChart = createChart('memChart', 'RAM Usage %', '#a855f7');
        if (memChart) pushToChart(memChart, memChartLabels, memChartData, data.usage_pct);

        const cur = document.getElementById('mem-current');
        if (cur) {
            cur.innerText = data.usage_pct + '%';
            cur.style.color =
                data.usage_pct >= 85 ? '#ff4444' :
                    data.usage_pct >= 70 ? '#ffcc00' : '#a855f7';
        }
    } catch (err) { console.error('Memory error:', err); }
}

// ===================================================
// DISK TAB
// ===================================================
async function loadDisk() {
    try {
        const res = await fetch('/api/disk');
        const data = await res.json();
        const tbody = document.getElementById('disk-body');
        tbody.innerHTML = '';
        data.forEach(item => {
            const color =
                item.status === 'CRITICAL' ? '#ff4444' :
                    item.status === 'WARNING' ? '#ffcc00' : '#00ff88';
            tbody.innerHTML += `
                <tr>
                    <td>${item.filesystem}</td>
                    <td>${item.size}</td>
                    <td>${item.used}</td>
                    <td>${item.avail}</td>
                    <td>${item.use_pct}%</td>
                    <td>${item.mounted}</td>
                    <td style="color:${color}; font-weight:bold">${item.status}</td>
                </tr>`;
        });
    } catch (err) { console.error('Disk error:', err); }
}

// ===================================================
// PROCESSES TAB
// ===================================================
async function loadProcesses() {
    try {
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
                    <td>
                        <button class="btn-kill"
                            onclick="askKill(${proc.pid}, '${proc.name}')">
                            🗑️ Kill
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error('Process error:', err); }
}

// ===================================================
// KILL PROCESS
// ===================================================
function askKill(pid, name) {
    targetPidToKill = pid;
    document.getElementById('modal-msg').innerText =
        `Are you sure you want to terminate "${name}" (PID: ${pid})?`;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    targetPidToKill = null;
}

async function confirmKill() {
    if (!targetPidToKill) return;
    try {
        const res = await fetch(`/api/kill/${targetPidToKill}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Process terminated');
    } catch (e) { alert('Error terminating process'); }
    closeModal();
    loadProcesses();
}

// ===================================================
// LIVE MONITOR
// ===================================================
async function updateLive() {
    try {
        const res = await fetch('/api/live');
        const data = await res.json();

        document.getElementById('live-cpu').innerText = data.cpu.usage + '%';
        setBar('live-cpu-bar', data.cpu.usage);
        const cb = document.getElementById('live-cpu-status');
        cb.innerText = data.cpu.status;
        cb.className = 'badge ' + data.cpu.status.toLowerCase();

        document.getElementById('live-mem').innerText = data.memory.usage_pct + '%';
        setBar('live-mem-bar', data.memory.usage_pct);
        const mb = document.getElementById('live-mem-status');
        mb.innerText = data.memory.status;
        mb.className = 'badge ' + data.memory.status.toLowerCase();

        document.getElementById('live-disk').innerText = data.disk.use_pct + '%';
        setBar('live-disk-bar', data.disk.use_pct);
        const db = document.getElementById('live-disk-status');
        db.innerText = data.disk.status;
        db.className = 'badge ' + data.disk.status.toLowerCase();

        const msg = document.getElementById('live-status-msg');
        if (msg) msg.innerText =
            `Last updated: ${new Date().toLocaleTimeString()} — refreshing every 5 seconds...`;

    } catch (err) {
        const msg = document.getElementById('live-status-msg');
        if (msg) msg.innerText = 'Error loading live data';
    }
}

function startLive() {
    if (!liveInterval) {
        updateLive();
        liveInterval = setInterval(updateLive, 5000);
        const btn = document.getElementById('live-btn');
        if (btn) btn.innerText = '⏸️ Pause';
    }
}

function toggleLive() {
    const btn = document.getElementById('live-btn');
    if (liveInterval) {
        stopLive();
        if (btn) btn.innerText = '▶️ Resume';
        const msg = document.getElementById('live-status-msg');
        if (msg) msg.innerText = 'Monitoring paused.';
    } else {
        startLive();
    }
}

// ===================================================
// REPORT
// ===================================================
async function generateReport() {
    const statusDiv = document.getElementById('report-status');
    statusDiv.innerText = '⏳ Generating report...';
    statusDiv.style.color = '#00d4ff';
    try {
        const res = await fetch('/api/report');
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'system_report.docx';
            a.click();
            statusDiv.innerText = '✅ Report downloaded successfully!';
            statusDiv.style.color = '#00ff88';
        } else {
            statusDiv.innerText = '❌ Error generating report.';
            statusDiv.style.color = '#ff4444';
        }
    } catch (err) {
        statusDiv.innerText = '❌ Error: ' + err.message;
        statusDiv.style.color = '#ff4444';
    }
}

// ===================================================
// INITIAL LOAD
// ===================================================
window.onload = function () {
    loadOverview();
    startOverviewRefresh();
};