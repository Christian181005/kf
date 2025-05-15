tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6',
                secondary: '#1e40af',
                accent: '#10b981',
                dark: '#1f2937',
                light: '#f9fafb'
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM‑Elemente
    const masterCheckbox     = document.getElementById('masterCheckbox');
    const scheduleTableBody  = document.getElementById('scheduleTableBody');
    const loadingRow         = document.getElementById('loadingRow');
    const deleteBtn          = document.getElementById('deleteSelected');
    const selectedCount      = document.getElementById('selectedCount');
    const scheduledClasses   = document.getElementById('scheduledClasses');
    const teachersToNotify   = document.getElementById('teachersToNotify');
    const graduatingClasses  = document.getElementById('graduatingClasses');
    const exportCSVBtn       = document.getElementById('exportCSVBtn');
    const exportPDFBtn       = document.getElementById('exportPDFBtn');
    const sendEmailsBtn      = document.getElementById('sendEmailsBtn');
    const emailModal         = document.getElementById('emailModal');
    const closeEmailModal    = document.getElementById('closeEmailModal');
    const openPopup          = document.getElementById('openPopup');
    const manualScheduleModal= document.getElementById('manualScheduleModal');
    const appointmentForm    = document.getElementById('appointmentForm');
    const closeManualModal   = document.getElementById('closeManualModal');
    const cancelManual       = document.getElementById('cancelManual');

    // Hilfsfunktionen
    function showNotification(msg, color, icon) {
        const n = document.createElement('div');
        n.className = `fixed bottom-4 right-4 bg-${color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center`;
        n.innerHTML = `<i class="fas ${icon} mr-2"></i><span>${msg}</span>`;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    }

    function downloadContent(content, filename, type) {
        const blob = new Blob([content], { type });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function loadJsonData() {
        try {
            const res = await fetch('json/output_data.json');
            if (!res.ok) throw new Error('Network response was not ok');
            return await res.json();
        } catch (e) {
            console.error('JSON load error', e);
            return null;
        }
    }

    function formatDate(ds) {
        if (!ds) return "Kein Termin";
        return `${ds.substr(6,2)}.${ds.substr(4,2)}.${ds.substr(0,4)}`;
    }

    function prepareTableData(data) {
        return data
            .filter(i => i.name && i.class_id)
            .map(i => {
                const isGrad  = i.name.startsWith('5');
                const dur     = isGrad ? 15 : 10;
                const kvMail  = i.kv ? `kv${i.name.toLowerCase()}@htl-steyr.ac.at` : null;
                const wlMail  = i.wl && i.wl!=="Can not access required information with API"
                                ? `wl${i.name.toLowerCase()}@htl-steyr.ac.at`
                                : null;
                const clsMail = `klasse${i.name.toLowerCase()}@htl-steyr.ac.at`;
                let slot      = "Kein Termin";
                if (i.nr1&&i.d1) slot = i.nr1;
                else if (i.nr2&&i.d2) slot = i.nr2;
                else if (i.nr3&&i.d3) slot = i.nr3;
                return {
                    class: i.name,
                    date: formatDate(i.d1||i.d2||i.d3),
                    time: slot,
                    duration: dur,
                    location: i.room_kl||"Nicht festgelegt",
                    responsible: i.kv||"Nicht festgelegt",
                    isGraduating: isGrad,
                    kvEmail: kvMail,
                    wlEmail: wlMail,
                    classEmail: clsMail,
                    priority: i.priority||2
                };
            })
            .sort((a,b) => a.priority - b.priority || a.class.localeCompare(b.class));
    }

    function getPriorityBadge(p) {
        return p===1
            ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 1</span>'
            : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 2</span>';
    }

    function updateStatistics(data) {
        scheduledClasses.textContent   = data.filter(i=>i.date!=="Kein Termin").length;
        teachersToNotify.textContent   = data.reduce((s,i)=>s + (!!i.kvEmail) + (!!i.wlEmail), 0);
        graduatingClasses.textContent  = data.filter(i=>i.isGraduating).length;
    }

    function updateSelectedCount() {
        selectedCount.textContent = document.querySelectorAll('.delete-checkbox:checked').length;
    }

    // Tabelle rendern
    function renderScheduleTable(data) {
        if (loadingRow) loadingRow.remove();
        scheduleTableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'schedule-item hover:bg-gray-50';
            row.innerHTML = `
              <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="delete-checkbox" data-class-id="${item.class}" />
                <div class="flex items-center">
                  <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-school text-blue-600"></i>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">${item.class}</div>
                    <div class="text-sm text-gray-500">
                      ${item.isGraduating?'Abschlussklasse':'Klasse'} ${getPriorityBadge(item.priority)}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.date}</div></td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${item.time}</div>
                <div class="text-xs text-gray-500">${item.duration} min</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.location}</div></td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.responsible}</div></td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-800 mr-3 text-2xl edit-btn" data-class='${JSON.stringify(item)}'>
                  <i class="fas fa-edit"></i>
                </button>
                <button class="text-primary hover:text-secondary text-2xl email-btn"
                  data-class="${item.class}"
                  data-kv="${item.kvEmail}"
                  data-wl="${item.wlEmail}"
                  data-classemail="${item.classEmail}">
                  <i class="fas fa-envelope"></i>
                </button>
              </td>`;
            scheduleTableBody.appendChild(row);
        });
        updateStatistics(data);
        updateSelectedCount();
    }

    // Klick auf Zeile toggelt Checkbox + Event
    scheduleTableBody.addEventListener('click', e => {
        const row = e.target.closest('tr.schedule-item');
        if (row && !e.target.closest('button') && !e.target.closest('input')) {
            const cb = row.querySelector('.delete-checkbox');
            cb.checked = !cb.checked;
            // hier ist der entscheidende Fix:
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // Master‑Checkbox
    masterCheckbox.addEventListener('change', () => {
        const all = document.querySelectorAll('.delete-checkbox');
        all.forEach(cb => {
            cb.checked = masterCheckbox.checked;
            cb.closest('tr').classList.toggle('bg-blue-50', masterCheckbox.checked);
        });
        updateSelectedCount();
    });

    // Einzel‑Checkbox
    document.addEventListener('change', e => {
        if (e.target.classList.contains('delete-checkbox')) {
            const row = e.target.closest('tr');
            row.classList.toggle('bg-blue-50', e.target.checked);
            if (!e.target.checked) masterCheckbox.checked = false;
            else if (document.querySelectorAll('.delete-checkbox:checked').length === document.querySelectorAll('.delete-checkbox').length) {
                masterCheckbox.checked = true;
            }
            updateSelectedCount();
        }
    });

    // Archivieren
    deleteBtn.addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.delete-checkbox:checked')).map(cb => cb.dataset.classId);
        if (!selected.length) {
            showNotification('Bitte wählen Sie Termine zum Archivieren aus', 'red-500', 'fa-exclamation-circle');
            return;
        }
        try {
            const [curRes, arcRes] = await Promise.all([
                fetch('json/output_data.json'),
                fetch('json/archive.json')
            ]);
            if (!curRes.ok || !arcRes.ok) throw new Error('Daten konnten nicht geladen werden');
            const curData = await curRes.json(), arcData = await arcRes.json();
            const toArchive = curData.filter(i => selected.includes(i.name));
            const remaining = curData.filter(i => !selected.includes(i.name));
            downloadContent(JSON.stringify(remaining, null, 2), 'output_data.json', 'application/json');
            downloadContent(JSON.stringify([...arcData, ...toArchive], null, 2), 'archive.json', 'application/json');
            showNotification(`${toArchive.length} Termine archiviert. Dateien wurden heruntergeladen.`, 'green-500', 'fa-check-circle');
            renderScheduleTable(prepareTableData(remaining));
        } catch (err) {
            console.error(err);
            showNotification('Fehler beim Archivieren: ' + err.message, 'red-500', 'fa-exclamation-circle');
        }
    });

    // CSV Export
    function generateCSV(data) {
        const headers = ["Klasse", "Datum", "Uhrzeit", "Dauer (min)", "Ort", "Verantwortlich", "Abschlussklasse", "Priorität"];
        const rows = data.map(i => [
            `"${i.class}"`,
            `"${i.date}"`,
            `"${i.time}"`,
            i.duration,
            `"${i.location}"`,
            `"${i.responsible}"`,
            i.isGraduating ? "Ja" : "Nein",
            i.priority
        ]);
        return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }
    exportCSVBtn.addEventListener('click', async () => {
        const data = await loadJsonData();
        if (data) {
            downloadContent(generateCSV(prepareTableData(data)), 'klassenfotos_terminplan.csv', 'text/csv');
            showNotification('CSV wird heruntergeladen...', 'blue-500', 'fa-file-csv');
        }
    });

    // PDF Export
    exportPDFBtn.addEventListener('click', () => {
        showNotification('PDF wird generiert...', 'red-500', 'fa-file-pdf');
    });

    // E‑Mail Modal
    sendEmailsBtn.addEventListener('click', () => emailModal.classList.remove('hidden'));
    closeEmailModal.addEventListener('click', () => emailModal.classList.add('hidden'));

    // Manueller Termin
    openPopup.addEventListener('click', () => manualScheduleModal.classList.remove('hidden'));
    closeManualModal.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));
    cancelManual.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));
    appointmentForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(appointmentForm);
        const dataObj = {
            klasse: formData.get('klasse'),
            datum: formData.get('datum'),
            zeitfenster: formData.get('zeitfenster'),
            verantwortlicher: formData.get('verantwortlicher'),
            ort: formData.get('ort')
        };
        try {
            const res = await fetch('/api/add_appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            if (res.ok) {
                alert('Termin erfolgreich erstellt!');
                manualScheduleModal.classList.add('hidden');
                appointmentForm.reset();
            } else alert('Fehler beim Erstellen des Termins.');
        } catch (err) {
            alert('Serverfehler: ' + err.message);
        }
    });

    // Initialisierung
    (async () => {
        const data = await loadJsonData();
        if (data) renderScheduleTable(prepareTableData(data));
        else scheduleTableBody.innerHTML = `
            <tr><td colspan="6" class="px-6 py-4 text-center text-red-500">
                Daten konnten nicht geladen werden.
            </td></tr>`;
    })();
});