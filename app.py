from flask import Flask, jsonify, render_template, send_file
import subprocess
import os

app = Flask(__name__)

# ===================================================
# HELPER FUNCTION - Bash script run karne ke liye
# ===================================================


def run_script(script_name, args=None):
    script_path = os.path.join(os.path.dirname(
        __file__), 'scripts', script_name)
    cmd = ['bash', script_path]
    if args:
        cmd.extend(args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

# ===================================================
# MAIN ROUTE - Dashboard
# ===================================================


@app.route('/')
def index():
    return render_template('index.html')

# ===================================================
# API ROUTES
# ===================================================

# CPU Data


@app.route('/api/cpu')
def cpu():
    try:
        output = run_script('cpu.sh')
        import json
        data = json.loads(output)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Memory Data


@app.route('/api/memory')
def memory():
    try:
        output = run_script('memory.sh')
        import json
        data = json.loads(output)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Disk Data


@app.route('/api/disk')
def disk():
    try:
        output = run_script('disk.sh')
        import json
        data = json.loads(output)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Process Data


@app.route('/api/processes')
def processes():
    try:
        output = run_script('process.sh')
        import json
        data = json.loads(output)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Kill Process


@app.route('/api/kill/<int:pid>', methods=['POST'])
def kill_process(pid):
    try:
        output = run_script('kill_process.sh', [str(pid)])
        import json
        data = json.loads(output)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Generate Report - Word Document (.docx)


@app.route('/api/report')
def report():
    try:
        import json
        from docx import Document
        from docx.shared import Pt, RGBColor, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        from datetime import datetime
        import socket

        # Collect data from bash scripts
        cpu_data = json.loads(run_script('cpu.sh'))
        mem_data = json.loads(run_script('memory.sh'))
        disk_data = json.loads(run_script('disk.sh'))
        proc_data = json.loads(run_script('process.sh'))

        # System info
        hostname = socket.gethostname()
        os_raw = subprocess.run(
            ['cat', '/etc/os-release'], capture_output=True, text=True).stdout
        os_name = next((l.split('=')[1].strip().strip('"') for l in os_raw.split(
            '\n') if l.startswith('PRETTY_NAME')), 'Linux')
        kernel = subprocess.run(
            ['uname', '-r'], capture_output=True, text=True).stdout.strip()
        uptime = subprocess.run(
            ['uptime', '-p'], capture_output=True, text=True).stdout.strip()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        doc = Document()

        # Page margins
        for section in doc.sections:
            section.top_margin = Inches(1)
            section.bottom_margin = Inches(1)
            section.left_margin = Inches(1.2)
            section.right_margin = Inches(1.2)

        # ── Helpers ──────────────────────────────────
        def hex_rgb(h):
            return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

        def add_heading(text):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(text)
            run.bold = True
            run.font.size = Pt(13)
            run.font.color.rgb = hex_rgb('1F3864')
            pPr = p._p.get_or_add_pPr()
            pBdr = OxmlElement('w:pBdr')
            bot = OxmlElement('w:bottom')
            bot.set(qn('w:val'),   'single')
            bot.set(qn('w:sz'),    '6')
            bot.set(qn('w:space'), '1')
            bot.set(qn('w:color'), '2E75B6')
            pBdr.append(bot)
            pPr.append(pBdr)

        def add_kv(label, value):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r1 = p.add_run(f'{label}: ')
            r1.bold = True
            r1.font.size = Pt(11)
            r1.font.color.rgb = hex_rgb('444444')
            r2 = p.add_run(str(value))
            r2.font.size = Pt(11)

        def add_status(status):
            color = '00AA55' if status == 'NORMAL' else (
                'FF8800' if status == 'WARNING' else 'CC0000')
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(f'Status:  {status}')
            r.bold = True
            r.font.size = Pt(11)
            r.font.color.rgb = hex_rgb(color)

        def set_cell_bg(cell, hex_color):
            tcPr = cell._tc.get_or_add_tcPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'),   'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'),  hex_color)
            tcPr.append(shd)

        def make_header_row(table, headers):
            row = table.rows[0]
            for i, h in enumerate(headers):
                cell = row.cells[i]
                cell.text = h
                run = cell.paragraphs[0].runs[0]
                run.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = hex_rgb('FFFFFF')
                set_cell_bg(cell, '1F3864')

        # ── Title ────────────────────────────────────
        t = doc.add_paragraph()
        t.alignment = WD_ALIGN_PARAGRAPH.CENTER
        tr = t.add_run('LINUX SYSTEM MONITORING TOOL')
        tr.bold = True
        tr.font.size = Pt(20)
        tr.font.color.rgb = hex_rgb('1F3864')

        s = doc.add_paragraph()
        s.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sr = s.add_run('System Performance Report')
        sr.font.size = Pt(13)
        sr.font.color.rgb = hex_rgb('2E75B6')

        d = doc.add_paragraph()
        d.alignment = WD_ALIGN_PARAGRAPH.CENTER
        dr = d.add_run(f'Generated: {now}')
        dr.font.size = Pt(10)
        dr.font.color.rgb = hex_rgb('888888')

        doc.add_paragraph()

        # ── 1. System Information ─────────────────────
        add_heading('1.  System Information')
        add_kv('Hostname',         hostname)
        add_kv('Operating System', os_name)
        add_kv('Kernel Version',   kernel)
        add_kv('System Uptime',    uptime)
        add_kv('Report Date/Time', now)

        # ── 2. CPU ───────────────────────────────────
        add_heading('2.  CPU Utilization')
        add_kv('CPU Usage',            f"{cpu_data.get('usage', '--')}%")
        add_kv('Load Average (1 min)', cpu_data.get('load_1min', '--'))
        add_status(cpu_data.get('status', 'NORMAL'))

        # ── 3. Memory ────────────────────────────────
        add_heading('3.  Memory Usage')
        add_kv('Total RAM',
               f"{round(mem_data.get('total_mb', 0)/1024, 1)} GB")
        add_kv('Used RAM',   f"{round(mem_data.get('used_mb', 0)/1024, 1)} GB")
        add_kv('Available',
               f"{round(mem_data.get('avail_mb', 0)/1024, 1)} GB")
        add_kv('Usage',      f"{mem_data.get('usage_pct', '--')}%")
        add_status(mem_data.get('status', 'NORMAL'))

        # ── 4. Disk Table ────────────────────────────
        add_heading('4.  Disk / File System Usage')
        disk_headers = ['Filesystem', 'Size', 'Used',
                        'Available', 'Use%', 'Mount Point', 'Status']
        dtable = doc.add_table(rows=1, cols=7)
        dtable.style = 'Table Grid'
        make_header_row(dtable, disk_headers)

        for fs in disk_data:
            row = dtable.add_row()
            st = fs.get('status', 'NORMAL')
            bg = 'E8F5E9' if st == 'NORMAL' else (
                'FFF8E1' if st == 'WARNING' else 'FFEBEE')
            vals = [fs.get('filesystem', ''), fs.get('size', ''), fs.get('used', ''),
                    fs.get('avail', ''), str(fs.get('use_pct', ''))+'%',
                    fs.get('mounted', ''), st]
            for i, val in enumerate(vals):
                cell = row.cells[i]
                cell.text = val
                run = cell.paragraphs[0].runs[0]
                run.font.size = Pt(9)
                if i == 6:
                    fc = '00AA55' if st == 'NORMAL' else (
                        'FF8800' if st == 'WARNING' else 'CC0000')
                    run.bold = True
                    run.font.color.rgb = hex_rgb(fc)
                set_cell_bg(cell, bg if i == 6 else 'FFFFFF')

        # ── 5. Process Table ─────────────────────────
        add_heading('5.  Active Processes (Top 15 by CPU)')
        ptable = doc.add_table(rows=1, cols=4)
        ptable.style = 'Table Grid'
        make_header_row(ptable, ['PID', 'Process Name', 'CPU %', 'MEM %'])

        for idx, proc in enumerate(proc_data):
            row = ptable.add_row()
            bg = 'F2F2F2' if idx % 2 == 0 else 'FFFFFF'
            vals = [str(proc.get('pid', '')), proc.get('name', ''),
                    str(proc.get('cpu', ''))+'%', str(proc.get('mem', ''))+'%']
            for i, val in enumerate(vals):
                cell = row.cells[i]
                cell.text = val
                run = cell.paragraphs[0].runs[0]
                run.font.size = Pt(10)
                set_cell_bg(cell, bg)

        # ── Footer ───────────────────────────────────
        doc.add_paragraph()
        fp = doc.add_paragraph()
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fr = fp.add_run('── Generated by Linux System Monitoring Tool ──')
        fr.font.size = Pt(9)
        fr.font.color.rgb = hex_rgb('999999')

        # ── Save & Send ──────────────────────────────
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        report_path = os.path.join(os.path.dirname(__file__), 'reports',
                                   f'system_report_{timestamp}.docx')
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        doc.save(report_path)
        return send_file(report_path, as_attachment=True,
                         download_name=f'system_report_{timestamp}.docx')

    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

# Live Monitor Data (CPU + RAM + Disk combined)


@app.route('/api/live')
def live():
    try:
        import json
        cpu_data = json.loads(run_script('cpu.sh'))
        mem_data = json.loads(run_script('memory.sh'))
        disk_data = json.loads(run_script('disk.sh'))
        max_disk = max(disk_data, key=lambda x: int(x.get('use_pct', 0)))
        return jsonify({'cpu': cpu_data, 'memory': mem_data, 'disk': max_disk})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===================================================
# RUN APP
# ===================================================
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
