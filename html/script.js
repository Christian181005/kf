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
    const scheduleTableBody = document.getElementById('scheduleTableBody');
    const loadingRow = document.getElementById('loadingRow');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const sendEmailsBtn = document.getElementById('sendEmailsBtn');
    const emailModal = document.getElementById('emailModal');
    const closeEmailModal = document.getElementById('closeEmailModal');
    const scheduledClasses = document.getElementById('scheduledClasses');
    const teachersToNotify = document.getElementById('teachersToNotify');
    const graduatingClasses = document.getElementById('graduatingClasses');
    const openPopup = document.getElementById('openPopup');
    const manualScheduleModal = document.getElementById('manualScheduleModal');
    const closeManualModal = document.getElementById('closeManualModal');
    const cancelManual = document.getElementById('cancelManual');
    const appointmentForm = document.getElementById('appointmentForm');
    const masterCheckbox = document.getElementById('masterCheckbox');
    const selectedCountEl = document.getElementById('selectedCount');

    // Laden + Rendern
    async function loadJsonData() {
        try {
            const res = await fetch('json/output_data.json');
            if (!res.ok) throw new Error();
            return await res.json();
        } catch {
            return null;
        }
    }

    function formatDate(d) {
        return d ? `${d.substr(6,2)}.${d.substr(4,2)}.${d.substr(0,4)}` : 'Kein Termin';
    }

    function prepareTableData(data) {
        return data
            .filter(i => i.name)
            .map(i => {
                const isGrad = i.name.startsWith('5');
                const time = i.nr1 && i.d1 ? i.nr1 : i.nr2 && i.d2 ? i.nr2 : i.nr3 && i.d3 ? i.nr3 : '–';
                return {
                    class: i.name,
                    date: formatDate(i.d1||i.d2||i.d3),
                    time,
                    duration: isGrad ? 15 : 10,
                    location: i.room_kl || '–',
                    responsible: i.kv || '–',
                    isGrad,
                    kvEmail: i.kv ? `kv${i.name.toLowerCase()}@htl-steyr.ac.at` : null,
                    wlEmail: i.wl ? `wl${i.name.toLowerCase()}@htl-steyr.ac.at` : null,
                    classEmail: `klasse${i.name.toLowerCase()}@htl-steyr.ac.at`,
                    priority: i.priority || 2
                };
            })
            .sort((a,b) => a.priority - b.priority || a.class.localeCompare(b.class));
    }

    function updateStatistics(data) {
        scheduledClasses.textContent = data.filter(i => i.date!=='Kein Termin').length;
        teachersToNotify.textContent = data.reduce((sum,i) => sum + (!!i.kvEmail) + (!!i.wlEmail), 0);
        graduatingClasses.textContent = data.filter(i => i.isGrad).length;
    }

    function renderScheduleTable(items) {
        loadingRow.remove();
        scheduleTableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'schedule-item';
            tr.dataset.class = JSON.stringify(item);
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-school text-blue-600"></i>
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${item.class}</div>
                            <div class="text-sm text-gray-500">${item.isGrad?'Abschlussklasse':'Klasse'} – Priorität ${item.priority}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">${item.date}</td>
                <td class="px-6 py-4">${item.time} <div class="text-xs text-gray-500">${item.duration} min</div></td>
                <td class="px-6 py-4">${item.location}</td>
                <td class="px-6 py-4">${item.responsible}</td>
                <td class="px-6 py-4 text-right">
                    <button class="edit-btn mr-4" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="email-btn" title="E-Mail"><i class="fas fa-envelope"></i></button>
                </td>`;
            scheduleTableBody.appendChild(tr);
        });
        updateStatistics(items);
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const selected = document.querySelectorAll('.schedule-item.selected').length;
        selectedCountEl.textContent = selected;
        masterCheckbox.checked = selected > 0 && selected === document.querySelectorAll('.schedule-item').length;
    }

    // Row-Click Selection
    scheduleTableBody.addEventListener('click', e => {
        const row = e.target.closest('tr.schedule-item');
        if (!row) return;
        row.classList.toggle('selected');
        updateSelectedCount();
    });

    // Master-Checkbox
    masterCheckbox.addEventListener('change', ()=> {
        document.querySelectorAll('.schedule-item').forEach(r => {
            r.classList.toggle('selected', masterCheckbox.checked);
        });
        updateSelectedCount();
    });

    // Initialisierung
    (async ()=> {
        const json = await loadJsonData();
        if (json) renderScheduleTable(prepareTableData(json));
        else scheduleTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Daten konnten nicht geladen werden.</td></tr>`;
    })();

    // Restliche Buttons (CSV, PDF, E‑Mail, Refresh) bleiben unverändert...
});
