document.addEventListener('DOMContentLoaded', function () {

    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    let currentEditingItem = null;
    const masterCheckbox = document.getElementById('masterCheckbox');
    const selectedCountEl = document.getElementById('selectedCount');

    function updateSelectedCount() {
        const selected = document.querySelectorAll('.schedule-item.selected').length;
        selectedCountEl.textContent = selected;
        masterCheckbox.checked = selected > 0 && selected === document.querySelectorAll('.schedule-item').length;
    }

    // Event Delegation für Edit-Buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            const btn = e.target.closest('.edit-btn');
            currentEditingItem = JSON.parse(btn.dataset.class);
            openEditModal(currentEditingItem);
        }


        // Modal schließen
        [closeEditModal, cancelEditBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                editModal.classList.add('hidden');
            });
        });

        // Öffne Modal mit Daten
        function openEditModal(item) {
            document.getElementById('editClass').value = item.class;
            document.getElementById('editDate').value = reverseDateForInput(item.date);
            document.getElementById('editTime').value = extractStartTime(item.time);
            document.getElementById('editLocation').value = item.location;
            document.getElementById('editResponsible').value = item.responsible;

            // Konvertiere das Datum in das Format YYYY-MM-DD für das date input Feld
            if (item.date && item.date !== "Kein Termin") {
                const [day, month, year] = item.date.split('.');
                document.getElementById('editDate').value = "${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')";
            } else {
                document.getElementById('editDate').value = '';
            }

            // Setze Uhrzeit (falls vorhanden)
            document.getElementById('editTime').value = item.time && item.time !== "Kein Termin" ?
                item.time.split(' - ')[0].padStart(5, '0') : '';

            document.getElementById('editLocation').value = item.location;
            document.getElementById('editResponsible').value = item.responsible;

            editModal.classList.remove('hidden');
        }

        saveEditBtn.addEventListener('click', async () => {
            if (!currentEditingItem) return;

            try {
                // Lade aktuelle Daten
                const response = await fetch('json/output_data.json');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();

                // Finde den zu bearbeitenden Eintrag
                const itemIndex = data.findIndex(item => item.name === currentEditingItem.class);
                if (itemIndex === -1) throw new Error('Eintrag nicht gefunden');

                // Aktualisiere die Daten
                const dateValue = document.getElementById('editDate').value;
                const timeValue = document.getElementById('editTime').value;
                const locationValue = document.getElementById('editLocation').value;
                const responsibleValue = document.getElementById('editResponsible').value;

                // Konvertiere Datum zurück in das Format YYYYMMDD
                if (dateValue) {
                    const [year, month, day] = dateValue.split('-');
                    data[itemIndex].d1 = `${year}${month}${day}`;
                }

                // Aktualisiere Uhrzeit
                if (timeValue) {
                    data[itemIndex].nr1 = timeValue;
                }

                // Aktualisiere Ort und Verantwortlichen
                data[itemIndex].room_kl = locationValue;
                data[itemIndex].kv = responsibleValue;

                // Sende die aktualisierten Daten an den Server
                const saveResponse = await fetch('/api/save_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await saveResponse.json();

                if (!result.success) {
                    throw new Error(result.message);
                }

                // Zeige Erfolgsmeldung
                showNotification('Änderungen erfolgreich gespeichert!', 'green-500', 'fa-check-circle');

                // Schließe das Modal
                editModal.classList.add('hidden');

                // Aktualisiere die Tabelle
                const tableData = prepareTableData(data);
                renderScheduleTable(tableData);

            } catch (error) {
                console.error('Fehler beim Speichern:', error);
                showNotification('Fehler beim Speichern: ' + error.message, 'red-500', 'fa-exclamation-circle');
            }

        });


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

        // Function to convert date format from YYYYMMDD to DD.MM.YYYY
        function formatDate(dateStr) {
            if (!dateStr || dateStr === "Kein Termin") return "Kein Termin";

            // Handle both number (20241016) and string ("20241016") formats
            const dateString = typeof dateStr === 'number' ? dateStr.toString() : dateStr;

            // Extract parts
            const year = dateString.substr(0, 4);
            const month = dateString.substr(4, 2);
            const day = dateString.substr(6, 2);

            return `${day}.${month}.${year}`;
        }

        // Function to convert time format from minutes (e.g., 800) to HH:MM (08:00)
        function formatTime(minutes) {
            if (!minutes) return "Kein Termin";

            // Handle both number (800) and string ("800") formats
            const minutesStr = typeof minutes === 'number' ? minutes.toString() : minutes;

            // Pad with leading zeros if needed
            const padded = minutesStr.padStart(4, '0');
            const hours = padded.substr(0, 2);
            const mins = padded.substr(2, 2);

            return `${hours}:${mins}`;
        }

        // Function to create time slot from start and end times
        function createTimeSlot(start, end) {
            if (!start || !end) return "Kein Termin";

            const startTime = formatTime(start);
            const endTime = formatTime(end);

            return `${startTime} - ${endTime}`;
        }

        // Modified prepareTableData function
        function prepareTableData(data) {
            return data
                .filter(item => item.name && item.class_id)
                .map(item => {
                    const isGraduating = item.name.startsWith('5');
                    const duration = isGraduating ? 15 : 10;
                    const kvEmail = item.kv ? `kv${item.name.toLowerCase()}@htl-steyr.ac.at` : null;
                    const classEmail = `klasse${item.name.toLowerCase()}@htl-steyr.ac.at`;

                    // Format date and time
                    const date = formatDate(item.date);
                    const time = createTimeSlot(item.start, item.end);

                    return {
                        class: item.name,
                        date: date,
                        time: time,
                        duration: duration,
                        location: Array.isArray(item.room_kl) ? item.room_kl[0] : item.room_kl || "Nicht festgelegt",
                        responsible: item.kv || "Nicht festgelegt",
                        isGraduating: isGraduating,
                        kvEmail: kvEmail,
                        wlEmail: item.wl && item.wl !== "Can not access required information with API" ?
                            `wl${item.name.toLowerCase()}@htl-steyr.ac.at` : null,
                        classEmail: classEmail,
                        priority: item.priority || 2
                    };
                })
                .sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    return a.class.localeCompare(b.class);
                });
        }

        // Function to reverse date format from DD.MM.YYYY to YYYY-MM-DD for date input
        function reverseDateForInput(d) {
            if (!d || d === "Kein Termin") return '';
            const parts = d.split('.');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return '';
        }

        // Function to extract start time from time slot for time input
        function extractStartTime(timeSlot) {
            if (!timeSlot || timeSlot === "Kein Termin") return '';
            return timeSlot.split(' - ')[0];
        }

        // Function to generate CSV from schedule data
        function generateCSV(data) {
            const headers = ["Klasse", "Datum", "Uhrzeit", "Dauer (min)", "Ort", "Verantwortlich", "Abschlussklasse", "Priorität"];
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

            return [headers.join(","), ...rows].join("\n");
        }

        // Function to download generated content
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

        // Function to generate email content for a class
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
Ihr Fotografieteam
        `.trim();
        }

        // Function to generate order document email content
        function generateOrderDocumentEmail(item) {
            return `
Sehr geehrte Schülerinnen und Schüler der ${item.class},

anbei finden Sie das Bestellformular für Ihre Klassenfotos.

Bitte beachten Sie die Bestellfrist und geben Sie das ausgefüllte Formular rechtzeitig bei Ihrem Klassenvorstand ab.

Mit freundlichen Grüßen,
Ihr Fotografie-Team
        `.trim();
        }

        // Function to populate email modal with class data
        function populateEmailModal(item) {
            // Get modal elements
            const recipientsContainer = document.querySelector('#emailModal .flex-wrap');
            const subjectInput = document.querySelector('#emailModal input[type="text"]');
            const messageTextarea = document.querySelector('#emailModal textarea');

            // Clear existing recipients
            recipientsContainer.innerHTML = '';

            // Add recipients based on settings
            const notifyKV = document.getElementById('notifyKV').checked;
            const notifyWL = document.getElementById('notifyWL').checked;
            const notifyClass = document.getElementById('notifyClass').checked;

            if (notifyClass && item.classEmail) {
                addRecipient(recipientsContainer, item.classEmail);
            }
            if (notifyKV && item.kvEmail) {
                addRecipient(recipientsContainer, item.kvEmail);
            }
            if (notifyWL && item.wlEmail) {
                addRecipient(recipientsContainer, item.wlEmail);
            }

            // Set subject and message
            subjectInput.value = `Termin für Klassenfotos - ${item.class}`;
            messageTextarea.value = generateEmailContent(item);
        }

        // Helper function to add recipient to modal
        function addRecipient(container, email) {
            const recipient = document.createElement('span');
            recipient.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center';
            recipient.innerHTML = `
            ${email}
            <button class="ml-2 text-blue-600 hover:text-blue-800 remove-recipient">
                <i class="fas fa-times"></i>
            </button>
        `;
            container.appendChild(recipient);
        }

        // Function to initialize email modal event listeners
        function initEmailModal() {
            // Close modal when clicking outside
            emailModal.addEventListener('click', (e) => {
                if (e.target === emailModal) {
                    emailModal.classList.add('hidden');
                }
            });

            // Remove recipient buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.remove-recipient')) {
                    e.target.closest('span').remove();
                }
            });
        }

        // Main function to load and render data
        async function initializeApp() {
            // Load data
            const jsonData = await loadJsonData();
            if (!jsonData) {
                renderErrorState();
                return;
            }

            // Prepare and render data
            const tableData = prepareTableData(jsonData);
            renderScheduleTable(tableData);

            // Initialize email modal
            initEmailModal();

            // Update stats
            updateStatistics(tableData);
        }

        // Function to render error state
        function renderErrorState() {
            scheduleTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
                </td>
            </tr>
        `;
        }

        // Function to update statistics
        function updateStatistics(data) {
            const graduatingCount = data.filter(item => item.isGraduating).length;
            const scheduledCount = data.filter(item => item.date !== "Kein Termin").length;
            const teachersCount = data.reduce((count, item) => {
                return count + (item.kvEmail ? 1 : 0) + (item.wlEmail ? 1 : 0);
            }, 0);

            scheduledClasses.textContent = scheduledCount;
            teachersToNotify.textContent = teachersCount;
            graduatingClasses.textContent = graduatingCount;
        }


        const toolbar = document.getElementById('toolbar');

        masterCheckbox.addEventListener('change', () => {
            const allCheckboxes = document.querySelectorAll('.delete-checkbox');
            allCheckboxes.forEach(cb => cb.checked = masterCheckbox.checked);
            toolbar.classList.toggle('hidden', !masterCheckbox.checked);
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('delete-checkbox')) {
                const checked = document.querySelectorAll('.delete-checkbox:checked').length;
                toolbar.classList.toggle('hidden', checked === 0);

                // Wenn einzelne Checkbox abgewählt wird, masterCheckbox ebenfalls abwählen
                if (!e.target.checked) {
                    masterCheckbox.checked = false;
                } else {
                    const all = document.querySelectorAll('.delete-checkbox').length;
                    if (checked === all) masterCheckbox.checked = true;
                }
            }
        });
    });


    const scheduleTableBody = document.getElementById('scheduleTableBody');
    const loadingRow = document.getElementById('loadingRow');
    const generateScheduleBtn = document.getElementById('generateScheduleBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const sendEmailsBtn = document.getElementById('sendEmailsBtn');
    const emailModal = document.getElementById('emailModal');
    const closeEmailModal = document.getElementById('closeEmailModal');
    const scheduledClasses = document.getElementById('scheduledClasses');
    const teachersToNotify = document.getElementById('teachersToNotify');
    const graduatingClasses = document.getElementById('graduatingClasses');

    // Function to get priority badge
    function getPriorityBadge(priority) {
        if (priority === 1) {
            return '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 1</span>';
        } else {
            return '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 2</span>';
        }
    }

    // Function to render schedule table
    function renderScheduleTable(data) {
        // Remove loading row
        if (loadingRow) loadingRow.remove();

        // Clear existing rows
        scheduleTableBody.innerHTML = '';

        // Add new rows
        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'schedule-item hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap appointment">

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
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${item.date}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${item.time}</div>
                    <div class="text-xs text-gray-500">${item.duration} min</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${item.location}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${item.responsible}</div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                    <button class="text-blue-600 hover:text-blue-800 mr-3 py-2 px-4 text-2xl edit-btn" data-class='${JSON.stringify(item)}'>
                      <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            scheduleTableBody.appendChild(row);
        });

        // Update stats
        updateStatistics(data);
    }

    // Event Listeners
    refreshBtn.addEventListener('click', async () => {
        // Show loading state
        scheduleTableBody.innerHTML = '';
        const loadingRow = document.createElement('tr');
        loadingRow.id = 'loadingRow';
        loadingRow.innerHTML = `
            <td colspan="6" class="px-6 py-8 text-center">
                <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-circle-notch loading-spinner text-3xl text-primary mb-2"></i>
                    <p class="text-gray-600">Aktualisiere Daten...</p>
                </div>
            </td>
        `;
        scheduleTableBody.appendChild(loadingRow);

        // Reload data
        const jsonData = await loadJsonData();
        if (jsonData) {
            const tableData = prepareTableData(jsonData);
            renderScheduleTable(tableData);

            // Show success notification
            showNotification('Daten erfolgreich aktualisiert!', 'green-500', 'fa-check-circle');
        } else {
            renderErrorState();
        }
    });

    exportCSVBtn.addEventListener('click', async () => {
        // Load current data
        const jsonData = await loadJsonData();
        if (jsonData) {
            const tableData = prepareTableData(jsonData);
            const csvContent = generateCSV(tableData);
            downloadContent(csvContent, 'klassenfotos_terminplan.csv', 'text/csv');
            showNotification('CSV wird heruntergeladen...', 'blue-500', 'fa-file-csv');
        } else {
            showNotification('Fehler beim Generieren der CSV', 'red-500', 'fa-exclamation-circle');
        }
    });

    exportPDFBtn.addEventListener('click', () => {
        // In a real implementation, this would generate a PDF
        showNotification('PDF wird generiert...', 'red-500', 'fa-file-pdf');
    });

    sendEmailsBtn.addEventListener('click', () => {
        emailModal.classList.remove('hidden');
    });

    closeEmailModal.addEventListener('click', () => {
        emailModal.classList.add('hidden');
    });

    // Delegate event for email buttons (since they're dynamically added)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.email-btn')) {
            const btn = e.target.closest('.email-btn');
            const classInfo = {
                class: btn.dataset.class,
                kvEmail: btn.dataset.kv,
                wlEmail: btn.dataset.wl,
                classEmail: btn.dataset.classemail
            };
            populateEmailModal(classInfo);
            emailModal.classList.remove('hidden');
        }
    });

    // Function to show notification
    function showNotification(message, color, icon) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 bg-${color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center`;
        notification.innerHTML = `
            <i class="fas ${icon} mr-2"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    const toolbar = document.getElementById('toolbar');


    document.addEventListener('change', () => {
        const selected = document.querySelectorAll('.delete-checkbox:checked');
        toolbar.classList.toggle('hidden', selected.length === 0);
    });


    const openPopup = document.getElementById('openPopup');
    const closePopup = document.getElementById('closePopup');
    const popupOverlay = document.getElementById('popupOverlay');
    const autoSchedule = document.getElementById('autoSchedule');
    const confirmAutoModal = document.getElementById('confirmAutoModal');
    const closeAutoModal = document.getElementById('closeAutoModal');
    const cancelAuto = document.getElementById('cancelAuto');
    const confirmAuto = document.getElementById('confirmAuto');
    const manualSchedule = document.getElementById('manualSchedule');

    const closeManualModal = document.getElementById('closeManualModal');
    const cancelManual = document.getElementById('cancelManual');
    openPopup.addEventListener('click', () => {
        popupOverlay.classList.remove('hidden');
        setTimeout(() => popupOverlay.classList.add('popup-enter-active'), 10);
    });
    closePopup.addEventListener('click', () => {
        popupOverlay.classList.remove('popup-enter-active');
        setTimeout(() => popupOverlay.classList.add('hidden'), 300);
    });
    autoSchedule.addEventListener('click', () => {
        popupOverlay.classList.remove('popup-enter-active');
        setTimeout(() => {
            popupOverlay.classList.add('hidden');
            confirmAutoModal.classList.remove('hidden');
        }, 300);
    });
    manualSchedule.addEventListener('click', () => {
        popupOverlay.classList.remove('popup-enter-active');
        setTimeout(() => {
            popupOverlay.classList.add('hidden');
            manualScheduleModal.classList.remove('hidden');
        }, 300);
    });
    [closeAutoModal, cancelAuto].forEach(btn => btn.addEventListener('click', () => confirmAutoModal.classList.add('hidden')));
    [closeManualModal, cancelManual].forEach(btn => btn.addEventListener('click', () => manualScheduleModal.classList.add('hidden')));

    confirmAuto.addEventListener('click', async () => {
        try {
            confirmAutoModal.classList.add('hidden');

            // 1. Alle Termine sofort entfernen
            scheduleTableBody.innerHTML = '';

            // 2. Ladebalken anzeigen
            const loadingRow = document.createElement('tr');
            loadingRow.id = 'loadingRow';
            loadingRow.innerHTML = `
                <td colspan="6" class="px-6 py-8 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-circle-notch loading-spinner text-3xl text-primary mb-2"></i>
                        <p class="text-gray-600">Terminplan wird generiert...</p>
                    </div>
                </td>
            `;
            scheduleTableBody.appendChild(loadingRow);

            // Zeige Lade-Notification
            showNotification('Automatische Terminplanung wird durchgeführt...', 'blue-500', 'fa-spinner fa-spin');

            // API aufrufen, um die Skripte zu starten
            const response = await fetch('/api/generate_schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Kleine Verzögerung, um sicherzustellen, dass die Datei geschrieben wurde
                setTimeout(async () => {
                    // Daten neu laden
                    const jsonData = await loadJsonData();
                    if (jsonData) {
                        const tableData = prepareTableData(jsonData);
                        renderScheduleTable(tableData);

                        // 4. Erfolgs-Notification anzeigen
                        showNotification('Terminplan erfolgreich generiert!', 'green-500', 'fa-check-circle');
                    }
                }, 2000);
            } else {
                showNotification('Fehler: ' + result.message, 'red-500', 'fa-exclamation-circle');
                renderErrorState();
            }
        } catch (error) {
            console.error('Fehler:', error);
            showNotification('Fehler beim Generieren des Terminplans', 'red-500', 'fa-exclamation-circle');
            renderErrorState();
        }
    });


    appointmentForm.addEventListener('submit', e => {
        e.preventDefault();
        alert('Termin erfolgreich erstellt!');
        manualScheduleModal.classList.add('hidden');
    });


    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editDate = document.getElementById('editDate');
    const editTime = document.getElementById('editTime');
    const editLocation = document.getElementById('editLocation');
    const editResponsible = document.getElementById('editResponsible');
    const editClass = document.getElementById('editClass');
    const cancelEdit = document.getElementById('cancelEdit');

    // Event: Öffne Bearbeitenmodal
    document.addEventListener('click', e => {
        const btn = e.target.closest('.edit-btn');
        console.log('Edit button clicked?', btn);
        if (btn) {
            let data = JSON.parse(btn.dataset.class);
            editClass.value = data.class;
            editDate.value = reverseDate(data.date);
            editTime.value = data.time
        }
    })


    // Event: Abbrechen
    cancelEdit.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    // Event: Speichern
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cls = editClass.value;

        try {
            const res = await fetch('json/output_data.json');
            const json = await res.json();
            const index = json.findIndex(item => item.name === cls);
            if (index === -1) throw new Error('Klasse nicht gefunden');

            json[index].d1 = editDate.value;
            json[index].nr1 = editTime.value;
            json[index].room_kl = editLocation.value;
            json[index].kv = editResponsible.value;

            // Neue Datei als Download anbieten
            downloadContent(JSON.stringify(json, null, 2), 'output_data.json', 'application/json');

            showNotification('Änderungen gespeichert – neue Datei heruntergeladen.', 'green-500', 'fa-save');
            editModal.classList.add('hidden');

            // Ansicht aktualisieren
            const tableData = prepareTableData(json);
            renderScheduleTable(tableData);

        } catch (err) {
            console.error('Bearbeiten-Fehler:', err);
            showNotification('Fehler beim Speichern', 'red-500', 'fa-exclamation-circle');
        }
    });

    function reverseDate(d) {
        const parts = d.split('.');
        return parts.length === 3 ? parts[2] + parts[1] + parts[0] : '';
    }


    const appointmentForm = document.getElementById('appointmentForm');
    const manualScheduleModal = document.getElementById('manualScheduleModal');


    // Event Listener für das Öffnen des Popups
    document.getElementById('openPopup')?.addEventListener('click', () => {
        document.getElementById('popupOverlay').classList.remove('hidden');
    });

    // Event Listener für das manuelle Termin-Formular
    document.getElementById('manualSchedule')?.addEventListener('click', () => {
        document.getElementById('popupOverlay').classList.add('hidden');
        document.getElementById('manualScheduleModal').classList.remove('hidden');
    });

    // Event Listener für das Schließen der Modals
    document.getElementById('closeManualModal')?.addEventListener('click', () => {
        document.getElementById('manualScheduleModal').classList.add('hidden');
    });

    document.getElementById('cancelManual')?.addEventListener('click', () => {
        document.getElementById('manualScheduleModal').classList.add('hidden');
    });

    // Funktion zur Konvertierung des Datums in das richtige Format (YYYYMMDD)
    function convertDateToNumber(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return parseInt(`${year}${month}${day}`, 10);
    }

    // Funktion zur Konvertierung der Zeit in Minuten (z.B. "09:20" → 920)
    function convertTimeToMinutes(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':');
        return parseInt(hours) * 100 + parseInt(minutes);
    }

    // Event Listener für das Formular-Submit
    document.getElementById('appointmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const zeitfenster = formData.get('zeitfenster');
        const [startTime, endTime] = zeitfenster.split(' - ');

        const newAppointment = {
            name: formData.get('klasse'),
            class_id: Date.now(), // Temporäre ID, sollte durch echte ID ersetzt werden
            kv: formData.get('verantwortlicher'),
            wl: "Can not access required information with API",
            room_kl: [formData.get('ort')],
            room_kv: "Unknown",
            notified_te: [],
            priority: 2,
            date: convertDateToNumber(formData.get('datum')),
            start: convertTimeToMinutes(startTime),
            end: convertTimeToMinutes(endTime)
        };

        try {
            const response = await fetch('/api/add_appointment', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newAppointment)
            });

            if (response.ok) {
                alert('Termin erfolgreich erstellt!');
                manualScheduleModal.classList.add('hidden');
                appointmentForm.reset();
            } else {
                alert('Fehler beim Erstellen des Termins.');
            }
        } catch (error) {
            alert('Serverfehler: ' + error.message);
        }
    });



})