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
    // DOM‑Elemente & Modals initialisieren
    const appointmentForm = document.getElementById('appointmentForm');
    const manualScheduleModal = document.getElementById('manualScheduleModal');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editDate = document.getElementById('editDate');
    const editTime = document.getElementById('editTime');
    const editLocation = document.getElementById('editLocation');
    const editResponsible = document.getElementById('editResponsible');
    const editClass = document.getElementById('editClass');
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const closeManualModal = document.getElementById('closeManualModal');
    const cancelManual = document.getElementById('cancelManual');
    const openPopup = document.getElementById('openPopup');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const sendEmailsBtn = document.getElementById('sendEmailsBtn');
    const emailModal = document.getElementById('emailModal');
    const closeEmailModal = document.getElementById('closeEmailModal');
    const scheduledClasses = document.getElementById('scheduledClasses');
    const teachersToNotify = document.getElementById('teachersToNotify');
    const graduatingClasses = document.getElementById('graduatingClasses');
    const masterCheckbox = document.getElementById('masterCheckbox');
    const toolbar = document.getElementById('toolbar');
    const deleteBtn = document.getElementById('deleteSelected');
    const scheduleTableBody = document.getElementById('scheduleTableBody');
    const loadingRow = document.getElementById('loadingRow');

    // Email modal elements
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailBody');
    const emailRecipients = document.getElementById('emailRecipients');
    const newRecipient = document.getElementById('newRecipient');
    const toggleRecipients = document.getElementById('toggleRecipients');
    const addAttachmentBtn = document.getElementById('addAttachmentBtn');
    const attachmentsContainer = document.getElementById('attachmentsContainer');
    const saveEmailDraftBtn = document.getElementById('saveEmailDraftBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');

    // Text formatting buttons
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnUnderline = document.getElementById('btn-underline');
    const btnUl = document.getElementById('btn-ul');
    const btnOl = document.getElementById('btn-ol');

    // File input for attachments (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Default email text
    const DEFAULT_EMAIL_TEXT =
        "Sehr geehrte Kolleginnen und Kollegen,\n\n" +
        "hiermit teilen wir Ihnen die Termine für die anstehenden Klassenfotos mit. Die genauen Details finden Sie im Anhang dieser E-Mail.\n\n" +
        "Bitte informieren Sie Ihre Schülerinnen und Schüler rechtzeitig und weisen Sie darauf hin, dass angemessene Kleidung für offizielle Schulfotos erwünscht ist. Das Tragen der Schuluniform bzw. korrekte Schulkleidung wird empfohlen.\n\n" +
        "Bei Fragen zu den Terminen wenden Sie sich bitte an das Sekretariat.\n\n" +
        "Mit freundlichen Grüßen,\n" +
        "Die Schulleitung";

    // Helper-Funktionen
    function showNotification(message, color, icon) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 bg-${color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center`;
        notification.innerHTML = `<i class="fas ${icon} mr-2"></i><span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function downloadContent(content, filename, type) {
        const blob = new Blob([content], {type});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

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

    function formatDate(dateStr) {
        if (!dateStr) return "Kein Termin";
        return `${dateStr.substr(6, 2)}.${dateStr.substr(4, 2)}.${dateStr.substr(0, 4)}`;
    }

    function prepareTableData(data) {
        return data
            .filter(item => item.name && item.class_id)
            .map(item => {
                const isGraduating = item.name.startsWith('5');
                const duration = isGraduating ? 15 : 10;
                const kvEmail = item.kv ? `kv${item.name.toLowerCase()}@htl-steyr.ac.at` : null;
                const wlEmail = item.wl && item.wl !== "Can not access required information with API"
                    ? `wl${item.name.toLowerCase()}@htl-steyr.ac.at`
                    : null;
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
                    wlEmail,
                    classEmail,
                    priority: item.priority || 2
                };
            })
            .sort((a, b) => a.priority - b.priority || a.class.localeCompare(b.class));
    }

    function getPriorityBadge(priority) {
        return priority === 1
            ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 1</span>'
            : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 2</span>';
    }

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
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.time}</div><div class="text-xs text-gray-500">${item.duration} min</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.location}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.responsible}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-800 mr-3 py-2 px-4 text-2xl edit-btn" data-class='${JSON.stringify(item)}'><i class="fas fa-edit"></i></button>
                    <button class="text-primary hover:text-secondary py-2 px-4 text-2xl email-btn"
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
    }

    function updateStatistics(data) {
        const graduatingCount = data.filter(i => i.isGraduating).length;
        const scheduledCount = data.filter(i => i.date !== "Kein Termin").length;
        const teachersCount = data.reduce((sum, i) => sum + (!!i.kvEmail) + (!!i.wlEmail), 0);
        scheduledClasses.textContent = scheduledCount;
        teachersToNotify.textContent = teachersCount;
        graduatingClasses.textContent = graduatingCount;
    }

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

    // Email-related functions
    function getSelectedClasses() {
        return Array.from(document.querySelectorAll('.delete-checkbox:checked'))
            .map(cb => cb.dataset.classId);
    }

    function populateEmailModal(data) {
        // Clear previous recipients
        emailRecipients.innerHTML = '';

        // Get selected classes or use the class from data if provided
        const selectedClasses = getSelectedClasses();
        const classes = selectedClasses.length ? selectedClasses : (data && data.class ? [data.class] : []);

        // Add class recipients
        classes.forEach(cls => {
            addRecipient(`klasse${cls.toLowerCase()}@htl-steyr.ac.at`);
        });

        // Set email subject with class names
        emailSubject.value = classes.length
            ? `Termin für Klassenfotos - ${classes.join(', ')}`
            : "Termin für Klassenfotos";

        // Set default email body if empty
        if (!emailBody.value) {
            emailBody.value = DEFAULT_EMAIL_TEXT;
        }

        // Prepare attachments container
        if (attachmentsContainer.children.length === 0) {
            attachmentsContainer.innerHTML = '<p class="text-gray-500 italic">Keine Anhänge hinzugefügt</p>';
        }
    }

    function addRecipient(email) {
        if (!email || email.trim() === '') return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            showNotification('Ungültige E-Mail-Adresse', 'red-500', 'fa-exclamation-circle');
            return;
        }

        // Check if recipient already exists
        if (Array.from(emailRecipients.children).some(el => el.dataset.email === email.trim())) {
            return;
        }

        const recipient = document.createElement('span');
        recipient.className = 'bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full flex items-center';
        recipient.dataset.email = email.trim();
        recipient.innerHTML = `
            ${email.trim()}
            <button class="ml-1 text-blue-600 remove-recipient">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        emailRecipients.appendChild(recipient);
    }

    function toggleRecipientsVisibility() {
        const isVisible = emailRecipients.style.display !== 'none';
        emailRecipients.style.display = isVisible ? 'none' : 'flex';
        toggleRecipients.innerHTML = isVisible
            ? '<i class="fas fa-eye mr-1"></i> Empfänger einblenden'
            : '<i class="fas fa-eye-slash mr-1"></i> Empfänger ausblenden';
    }

    function formatSelectedText(command, value = null) {
        // Get selection
        const selectionStart = emailBody.selectionStart;
        const selectionEnd = emailBody.selectionEnd;
        const selectedText = emailBody.value.substring(selectionStart, selectionEnd);

        if (selectionStart === selectionEnd) {
            // No text selected, return
            return;
        }

        let newText;

        switch (command) {
            case 'bold':
                newText = `<strong>${selectedText}</strong>`;
                break;
            case 'italic':
                newText = `<em>${selectedText}</em>`;
                break;
            case 'underline':
                newText = `<u>${selectedText}</u>`;
                break;
            case 'ul':
                // Split text into lines and add HTML list items
                newText = '<ul>\n' +
                    selectedText.split('\n')
                        .map(line => line.trim() ? `  <li>${line}</li>` : '')
                        .join('\n') +
                    '\n</ul>';
                break;
            case 'ol':
                // Split text into lines and add HTML ordered list items
                newText = '<ol>\n' +
                    selectedText.split('\n')
                        .map(line => line.trim() ? `  <li>${line}</li>` : '')
                        .join('\n') +
                    '\n</ol>';
                break;
            default:
                return;
        }

        // Replace the selected text with formatted text
        emailBody.value = emailBody.value.substring(0, selectionStart) +
            newText +
            emailBody.value.substring(selectionEnd);

        // Restore focus and selection
        emailBody.focus();
        emailBody.selectionStart = selectionStart;
        emailBody.selectionEnd = selectionStart + newText.length;
    }

    function addAttachment() {
        fileInput.click();
    }

    function handleFileSelection(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Remove "no attachments" message if present
        const noAttachmentsMsg = attachmentsContainer.querySelector('p.text-gray-500.italic');
        if (noAttachmentsMsg) {
            attachmentsContainer.innerHTML = '';
        }

        Array.from(files).forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'flex items-center justify-between p-2 border-b last:border-b-0';

            // Get file size in KB or MB
            const fileSize = file.size < 1024 * 1024
                ? `${Math.round(file.size / 1024)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

            fileElement.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-file-alt text-gray-500 mr-2"></i>
                    <div>
                        <div class="text-sm font-medium">${file.name}</div>
                        <div class="text-xs text-gray-500">${fileSize}</div>
                    </div>
                </div>
                <button class="text-red-500 hover:text-red-700 remove-attachment">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            // Store file data for later use
            fileElement.dataset.filename = file.name;
            fileElement.dataset.filesize = file.size;

            attachmentsContainer.appendChild(fileElement);
        });

        // Reset file input
        fileInput.value = '';
    }

    function removeAttachment(element) {
        element.closest('div').remove();

        // Add "no attachments" message if no attachments left
        if (attachmentsContainer.children.length === 0) {
            attachmentsContainer.innerHTML = '<p class="text-gray-500 italic">Keine Anhänge hinzugefügt</p>';
        }
    }

    function sendEmail() {
        // Get all recipients
        const recipients = Array.from(emailRecipients.children).map(el => el.dataset.email);

        if (recipients.length === 0) {
            showNotification('Bitte mindestens einen Empfänger hinzufügen', 'red-500', 'fa-exclamation-circle');
            return;
        }

        if (!emailSubject.value.trim()) {
            showNotification('Bitte einen Betreff eingeben', 'red-500', 'fa-exclamation-circle');
            return;
        }

        if (!emailBody.value.trim()) {
            showNotification('Bitte eine Nachricht eingeben', 'red-500', 'fa-exclamation-circle');
            return;
        }

        // Count attachments
        const attachments = attachmentsContainer.querySelectorAll('div.flex');
        const attachmentCount = attachments.length;

        // Here you would send the email via your backend API
        // For now, we'll just simulate it
        setTimeout(() => {
            showNotification(`E-Mail an ${recipients.length} Empfänger mit ${attachmentCount} Anhängen gesendet`, 'green-500', 'fa-check-circle');
            emailModal.classList.add('hidden');
        }, 1000);
    }

    function saveEmailDraft() {
        showNotification('Entwurf gespeichert', 'blue-500', 'fa-save');
    }

    // Event-Handlers
    openPopup.addEventListener('click', () => manualScheduleModal.classList.remove('hidden'));
    closeManualModal.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));
    cancelManual.addEventListener('click', () => manualScheduleModal.classList.add('hidden'));
    closeEmailModal.addEventListener('click', () => emailModal.classList.add('hidden'));
    closeEditModal.addEventListener('click', () => editModal.classList.add('hidden'));
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(dataObj)
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

    refreshBtn.addEventListener('click', async () => {
        scheduleTableBody.innerHTML = '';
        scheduleTableBody.appendChild(loadingRow.cloneNode(true));
        const data = await loadJsonData();
        if (data) {
            renderScheduleTable(prepareTableData(data));
            showNotification('Daten erfolgreich aktualisiert!', 'green-500', 'fa-check-circle');
        }
    });

    exportCSVBtn.addEventListener('click', async () => {
        const data = await loadJsonData();
        if (data) {
            downloadContent(generateCSV(prepareTableData(data)), 'klassenfotos_terminplan.csv', 'text/csv');
            showNotification('CSV wird heruntergeladen...', 'blue-500', 'fa-file-csv');
        }
    });

    exportPDFBtn.addEventListener('click', () => showNotification('PDF wird generiert...', 'red-500', 'fa-file-pdf'));

    sendEmailsBtn.addEventListener('click', () => {
        populateEmailModal();
        emailModal.classList.remove('hidden');
    });

    // Email modal buttons
    toggleRecipients.addEventListener('click', toggleRecipientsVisibility);
    btnBold.addEventListener('click', () => formatSelectedText('bold'));
    btnItalic.addEventListener('click', () => formatSelectedText('italic'));
    btnUnderline.addEventListener('click', () => formatSelectedText('underline'));
    btnUl.addEventListener('click', () => formatSelectedText('ul'));
    btnOl.addEventListener('click', () => formatSelectedText('ol'));
    addAttachmentBtn.addEventListener('click', addAttachment);
    fileInput.addEventListener('change', handleFileSelection);
    saveEmailDraftBtn.addEventListener('click', saveEmailDraft);
    sendEmailBtn.addEventListener('click', sendEmail);

    // New recipient input
    newRecipient.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addRecipient(newRecipient.value);
            newRecipient.value = '';
        }
    });

    document.addEventListener('click', e => {
        if (e.target.closest('.edit-btn')) {
            const btn = e.target.closest('.edit-btn');
            const itemData = JSON.parse(btn.dataset.class);

            // Fill edit modal with data
            editClass.value = itemData.class;

            // Convert date to YYYY-MM-DD format for input
            if (itemData.date && itemData.date !== "Kein Termin") {
                const dateParts = itemData.date.split('.');
                editDate.value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            } else {
                editDate.value = '';
            }

            // Set time value
            if (itemData.time && itemData.time !== "Kein Termin") {
                const timeParts = itemData.time.split(' - ')[0].split(':');
                editTime.value = `${timeParts[0]}:${timeParts[1]}`;
            } else {
                editTime.value = '';
            }

            editLocation.value = itemData.location;
            editResponsible.value = itemData.responsible;

            // Show modal
            editModal.classList.remove('hidden');
        }

        if (e.target.closest('.email-btn')) {
            const btn = e.target.closest('.email-btn');
            populateEmailModal({
                class: btn.dataset.class,
                kvEmail: btn.dataset.kv,
                wlEmail: btn.dataset.wl,
                classEmail: btn.dataset.classemail
            });
            emailModal.classList.remove('hidden');
        }

        if (e.target.closest('.remove-recipient')) {
            e.target.closest('span').remove();
        }

        if (e.target.closest('.remove-attachment')) {
            removeAttachment(e.target);
        }
    });

    // Checkbox‑Logik
    masterCheckbox.addEventListener('change', () => {
        const all = document.querySelectorAll('.delete-checkbox');
        all.forEach(cb => cb.checked = masterCheckbox.checked);
        toolbar.classList.toggle('hidden', !masterCheckbox.checked);
    });

    document.addEventListener('change', e => {
        if (e.target.classList.contains('delete-checkbox')) {
            const checkedCount = document.querySelectorAll('.delete-checkbox:checked').length;
            toolbar.classList.toggle('hidden', checkedCount === 0);
            if (!e.target.checked) masterCheckbox.checked = false;
            else if (checkedCount === document.querySelectorAll('.delete-checkbox').length) masterCheckbox.checked = true;
        }
    });

    deleteBtn.addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.delete-checkbox:checked')).map(cb => cb.dataset.classId);
        if (!selected.length) {
            showNotification('Bitte wählen Sie Termine zum Archivieren aus', 'red-500', 'fa-exclamation-circle');
            return;
        }
        try {
            const [curRes, arcRes] = await Promise.all([fetch('json/output_data.json'), fetch('json/archive.json')]);
            if (!curRes.ok || !arcRes.ok) throw new Error('Daten konnten nicht geladen werden');
            const curData = await curRes.json(), arcData = await arcRes.json();
            const toArchive = curData.filter(i => selected.includes(i.name));
            const remaining = curData.filter(i => !selected.includes(i.name));
            downloadContent(JSON.stringify(remaining, null, 2), 'output_data.json', 'application/json');
            downloadContent(JSON.stringify([...arcData, ...toArchive], null, 2), 'archive.json', 'application/json');
            showNotification(`${toArchive.length} Termine archiviert. Dateien wurden heruntergeladen.`, 'green-500', 'fa-check-circle');
            renderScheduleTable(prepareTableData(remaining));
            toolbar.classList.add('hidden');
        } catch (err) {
            console.error(err);
            showNotification('Fehler beim Archivieren: ' + err.message, 'red-500', 'fa-exclamation-circle');
        }
    });

    // App‑Initialisierung
    (async () => {
        const data = await loadJsonData();
        if (data) renderScheduleTable(prepareTableData(data));
        else scheduleTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</td></tr>`;
    })();
});