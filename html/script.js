// Tailwind-Konfiguration
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

// Alle DOMContentLoaded-Listener und Funktionen zusammenführen
document.addEventListener('DOMContentLoaded', () => {

    // Elemente
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

    // Hilfsfunktionen
    function showNotification(message, color, icon) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 bg-${color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center`;
        notification.innerHTML = `<i class="fas ${icon} mr-2"></i><span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function downloadContent(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // JSON-Laden
    async function loadJsonData() {
        try {
            const response = await fetch('json/output_data.json');
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error loading JSON data:', error);
            return null;
        }
    }

    // Datum/Uhrzeit formatieren
    function formatDate(dateStr) {
        if (!dateStr) return "Kein Termin";
        return `${dateStr.substr(6, 2)}.${dateStr.substr(4, 2)}.${dateStr.substr(0, 4)}`;
    }

    // Daten für die Tabelle aufbereiten
    function prepareTableData(data) {
        return data
            .filter(item => item.name && item.class_id)
            .map(item => {
                const isGraduating = item.name.startsWith('5');
                const duration = isGraduating ? 15 : 10;
                const kvEmail = item.kv ? `kv${item.name.toLowerCase()}@htl-steyr.ac.at` : null;
                const classEmail = `klasse${item.name.toLowerCase()}@htl-steyr.ac.at`;
                let timeSlot = "Kein Termin";
                if (item.nr1 && item.d1) timeSlot = item.nr1;
                else if (item.nr2 && item.d2) timeSlot = item.nr2;
                else if (item.nr3 && item.d3) timeSlot = item.nr3;
                return {
                    class: item.name,
                    date: formatDate(item.d1 || item.d2 || item.d3),
                    time: timeSlot,
                    duration,
                    location: item.room_kl || "Nicht festgelegt",
                    responsible: item.kv || "Nicht festgelegt",
                    isGraduating,
                    kvEmail,
                    wlEmail: item.wl && item.wl !== "Can not access required information with API"
                        ? `wl${item.name.toLowerCase()}@htl-steyr.ac.at`
                        : null,
                    classEmail,
                    priority: item.priority || 2
                };
            })
            .sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.class.localeCompare(b.class);
            });
    }

    // Badges
    function getPriorityBadge(priority) {
        return priority === 1
            ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 1</span>'
            : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 2</span>';
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
                    <div class="flex items-center">
                        <input type="checkbox" class="delete-checkbox" data-class-id="${item.class}" />
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-school text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${item.class}</div>
                            <div class="text-sm text-gray-500">${item.isGraduating ? 'Abschlussklasse' : 'Klasse'} ${getPriorityBadge(item.priority)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.date}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.time}</div><div class="text-xs text-gray-500">${item.duration} min</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.location}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.responsible}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-800 mr-3 py-2 px-4 text-2xl edit-btn" data-class='${JSON.stringify(item)}'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-primary hover:text-secondary mr-3 py-2 px-4 text-2xl email-btn" data-class="${item.class}" data-kv="${item.kvEmail}" data-wl="${item.wlEmail}" data-classemail="${item.classEmail}">
                        <i class="fas fa-envelope"></i>
                    </button>
                </td>
            `;
            scheduleTableBody.appendChild(row);
        });
        updateStatistics(data);
    }

    // Statistik updaten
    function updateStatistics(data) {
        const graduatingCount = data.filter(item => item.isGraduating).length;
        const scheduledCount = data.filter(item => item.date !== "Kein Termin").length;
        const teachersCount = data.reduce((count, item) => count + (item.kvEmail ? 1 : 0) + (item.wlEmail ? 1 : 0), 0);
        scheduledClasses.textContent = scheduledCount;
        teachersToNotify.textContent = teachersCount;
        graduatingClasses.textContent = graduatingCount;
    }

    // CSV generieren
    function generateCSV(data) {
        const headers = ["Klasse","Datum","Uhrzeit","Dauer (min)","Ort","Verantwortlich","Abschlussklasse","Priorität"];
        const rows = data.map(item => [
            `"${item.class}"`,
            `"${item.date}"`,
            `"${item.time}"`,
            item.duration,
            `"${item.location}"`,
            `"${item.responsible}"`,
            item.isGraduating ? "Ja" : "Nein",
            item.priority
        ]);
        return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    // E-Mail-Modal Funktionen
    function generateEmailContent(item) {
        return `
Sehr geehrte Schülerinnen und Schüler der ${item.class},

hiermit möchten wir Sie über den Termin für die Klassenfotos informieren:

Datum: ${item.date}
Uhrzeit: ${item.time}
Ort: ${item.location}
Dauer: ${item.duration} Minuten

Bitte erscheinen Sie pünktlich und in angemessener Kleidung.

${item.isGraduating ? "Da es sich um eine Abschlussklasse handelt, werden zusätzlich alternative Fotos gemacht. Bitte planen Sie entsprechend mehr Zeit ein." : ""}

Mit freundlichen Grüßen,
Ihr Fotografieteam`.trim();
    }

    function populateEmailModal(item) {
        const recipientsContainer = document.querySelector('#emailModal .flex-wrap');
        const subjectInput = document.querySelector('#emailModal input[type="text"]');
        const messageTextarea = document.querySelector('#emailModal textarea');
        recipientsContainer.innerHTML = '';
        if (item.classEmail) addRecipient(recipientsContainer, item.classEmail);
        if (item.kvEmail) addRecipient(recipientsContainer, item.kvEmail);
        if (item.wlEmail) addRecipient(recipientsContainer, item.wlEmail);
        subjectInput.value = `Termin für Klassenfotos - ${item.class}`;
        messageTextarea.value = generateEmailContent(item);
    }

    function addRecipient(container, email) {
        const recipient = document.createElement('span');
        recipient.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center';
        recipient.innerHTML = `
            ${email}
            <button class="ml-2 text-blue-600 hover:text-blue-800 remove-recipient">
                <i class="fas fa-times"></i>
            </button>`;
        container.appendChild(recipient);
    }

    // Event-Delegation
    document.addEventListener('click', e => {
        // Edit-Button
        if (e.target.closest('.edit-btn')) {
            const item = JSON.parse(e.target.closest('.edit-btn').dataset.class);
            // … hier könnte man das Edit-Modal befüllen …
        }
        // Email-Button
        if (e.target.closest('.email-btn')) {
            const btn = e.target.closest('.email-btn');
            const info = {
                class: btn.dataset.class,
                kvEmail: btn.dataset.kv,
                wlEmail: btn.dataset.wl,
                classEmail: btn.dataset.classemail
            };
            populateEmailModal(info);
            emailModal.classList.remove('hidden');
        }
        // Remove-Recipient
        if (e.target.closest('.remove-recipient')) {
            e.target.closest('span').remove();
        }
    });

    // Button-Listener
    refreshBtn.addEventListener('click', async () => {
        scheduleTableBody.innerHTML = '';
        scheduleTableBody.appendChild(loadingRow.cloneNode(true));
        const jsonData = await loadJsonData();
        if (jsonData) {
            renderScheduleTable(prepareTableData(jsonData));
            showNotification('Daten erfolgreich aktualisiert!', 'green-500', 'fa-check-circle');
        }
    });

    exportCSVBtn.addEventListener('click', async () => {
        const jsonData = await loadJsonData();
        if (jsonData) {
            const csv = generateCSV(prepareTableData(jsonData));
            downloadContent(csv, 'klassenfotos_terminplan.csv', 'text/csv');
            showNotification('CSV wird heruntergeladen...', 'blue-500', 'fa-file-csv');
        }
    });

    exportPDFBtn.addEventListener('click', () => {
        showNotification('PDF wird generiert...', 'red-500', 'fa-file-pdf');
    });

    sendEmailsBtn.addEventListener('click', () => emailModal.classList.remove('hidden'));
    closeEmailModal.addEventListener('click', () => emailModal.classList.add('hidden'));

    // Manueller Termin-Popup
    openPopup.addEventListener('click', () => manualScheduleModal.classList.remove('hidden'));
    closeManualModal.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));
    cancelManual.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));

    appointmentForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(appointmentForm);
        const data = {
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
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Termin erfolgreich erstellt!');
                manualScheduleModal.classList.add('hidden');
                appointmentForm.reset();
            } else {
                alert('Fehler beim Erstellen des Termins.');
            }
        } catch (err) {
            alert('Serverfehler: ' + err.message);
        }
    });

    // App initialisieren
    (async () => {
        const jsonData = await loadJsonData();
        if (jsonData) renderScheduleTable(prepareTableData(jsonData));
        else scheduleTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</td></tr>`;
    })();

});
