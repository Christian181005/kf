// Tailwind‑Konfiguration (aus dem ersten Inline‑Script)
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

// Alle weiteren Inline‑Scripts aus index.html
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
    const cancelEdit = document.getElementById('cancelEdit');
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

    // Helper-Funktionen
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
        return `${dateStr.substr(6,2)}.${dateStr.substr(4,2)}.${dateStr.substr(0,4)}`;
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
                    date: formatDate(item.d1||item.d2||item.d3),
                    time: timeSlot,
                    duration,
                    location: item.room_kl||"Nicht festgelegt",
                    responsible: item.kv||"Nicht festgelegt",
                    isGraduating,
                    kvEmail,
                    wlEmail,
                    classEmail,
                    priority: item.priority||2
                };
            })
            .sort((a,b) => a.priority - b.priority || a.class.localeCompare(b.class));
    }

    function getPriorityBadge(priority) {
        return priority===1
            ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 1</span>'
            : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Priorität 2</span>';
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
                            <div class="text-sm text-gray-500">${item.isGraduating?'Abschlussklasse':'Klasse'} ${getPriorityBadge(item.priority)}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.date}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">${item.time}</div><div class="text-xs text-gray-500">${item.duration} min</div></td>
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
        const graduatingCount = data.filter(i=>i.isGraduating).length;
        const scheduledCount = data.filter(i=>i.date!=="Kein Termin").length;
        const teachersCount = data.reduce((sum,i)=>sum + (!!i.kvEmail) + (!!i.wlEmail),0);
        scheduledClasses.textContent = scheduledCount;
        teachersToNotify.textContent = teachersCount;
        graduatingClasses.textContent = graduatingCount;
    }

    function generateCSV(data) {
        const headers = ["Klasse","Datum","Uhrzeit","Dauer (min)","Ort","Verantwortlich","Abschlussklasse","Priorität"];
        const rows = data.map(i=>[
            `"${i.class}"`,
            `"${i.date}"`,
            `"${i.time}"`,
            i.duration,
            `"${i.location}"`,
            `"${i.responsible}"`,
            i.isGraduating?"Ja":"Nein",
            i.priority
        ]);
        return [headers.join(","),...rows.map(r=>r.join(","))].join("\n");
    }

    // Event-Handlers
    openPopup.addEventListener('click',()=>manualScheduleModal.classList.remove('hidden'));
    closeManualModal.addEventListener('click',()=>manualScheduleModal.classList.add('hidden'));
    cancelManual.addEventListener('click',()=>manualScheduleModal.classList.add('hidden'));

    appointmentForm.addEventListener('submit',async e=>{
        e.preventDefault();
        const formData=new FormData(appointmentForm);
        const dataObj={
            klasse: formData.get('klasse'),
            datum: formData.get('datum'),
            zeitfenster: formData.get('zeitfenster'),
            verantwortlicher: formData.get('verantwortlicher'),
            ort: formData.get('ort')
        };
        try {
            const res=await fetch('/api/add_appointment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dataObj)});
            if(res.ok){alert('Termin erfolgreich erstellt!'); manualScheduleModal.classList.add('hidden'); appointmentForm.reset();}
            else alert('Fehler beim Erstellen des Termins.');
        } catch(err){alert('Serverfehler: '+err.message);}
    });

    refreshBtn.addEventListener('click',async ()=>{
        scheduleTableBody.innerHTML=''; scheduleTableBody.appendChild(loadingRow.cloneNode(true));
        const data=await loadJsonData();
        if(data){ renderScheduleTable(prepareTableData(data)); showNotification('Daten erfolgreich aktualisiert!','green-500','fa-check-circle'); }
    });

    exportCSVBtn.addEventListener('click',async ()=>{
        const data=await loadJsonData();
        if(data){ downloadContent(generateCSV(prepareTableData(data)),'klassenfotos_terminplan.csv','text/csv'); showNotification('CSV wird heruntergeladen...','blue-500','fa-file-csv'); }
    });

    exportPDFBtn.addEventListener('click',()=> showNotification('PDF wird generiert...','red-500','fa-file-pdf'));

    sendEmailsBtn.addEventListener('click',()=> emailModal.classList.remove('hidden'));
    closeEmailModal.addEventListener('click',()=> emailModal.classList.add('hidden'));

    document.addEventListener('click',e=>{
        if(e.target.closest('.edit-btn')){
            // hier Edit‑Modal befüllen …
        }
        if(e.target.closest('.email-btn')){
            const btn=e.target.closest('.email-btn');
            populateEmailModal({
                class: btn.dataset.class,
                kvEmail: btn.dataset.kv,
                wlEmail: btn.dataset.wl,
                classEmail: btn.dataset.classemail
            });
            emailModal.classList.remove('hidden');
        }
        if(e.target.closest('.remove-recipient')){
            e.target.closest('span').remove();
        }
    });

    // Checkbox‑Logik
    masterCheckbox.addEventListener('change',()=>{
        const all= document.querySelectorAll('.delete-checkbox');
        all.forEach(cb=>cb.checked=masterCheckbox.checked);
        toolbar.classList.toggle('hidden', !masterCheckbox.checked);
    });
    document.addEventListener('change',e=>{
        if(e.target.classList.contains('delete-checkbox')){
            const checkedCount=document.querySelectorAll('.delete-checkbox:checked').length;
            toolbar.classList.toggle('hidden', checkedCount===0);
            if(!e.target.checked) masterCheckbox.checked=false;
            else if(checkedCount===document.querySelectorAll('.delete-checkbox').length) masterCheckbox.checked=true;
        }
    });

    deleteBtn.addEventListener('click', async ()=>{
        const selected=Array.from(document.querySelectorAll('.delete-checkbox:checked')).map(cb=>cb.dataset.classId);
        if(!selected.length){showNotification('Bitte wählen Sie Termine zum Archivieren aus','red-500','fa-exclamation-circle'); return;}
        try {
            const [curRes,arcRes]=await Promise.all([fetch('json/output_data.json'),fetch('json/archive.json')]);
            if(!curRes.ok||!arcRes.ok) throw new Error('Daten konnten nicht geladen werden');
            const curData=await curRes.json(), arcData=await arcRes.json();
            const toArchive=curData.filter(i=>selected.includes(i.name));
            const remaining=curData.filter(i=>!selected.includes(i.name));
            downloadContent(JSON.stringify(remaining,null,2),'output_data.json','application/json');
            downloadContent(JSON.stringify([...arcData,...toArchive],null,2),'archive.json','application/json');
            showNotification(`${toArchive.length} Termine archiviert. Dateien wurden heruntergeladen.`,'green-500','fa-check-circle');
            renderScheduleTable(prepareTableData(remaining));
            toolbar.classList.add('hidden');
        } catch(err){
            console.error(err);
            showNotification('Fehler beim Archivieren: '+err.message,'red-500','fa-exclamation-circle');
        }
    });

    // App‑Initialisierung
    (async ()=>{
        const data=await loadJsonData();
        if(data) renderScheduleTable(prepareTableData(data));
        else scheduleTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</td></tr>`;
    })();

    // Funktionen für E‑Mail‑Modal (generateEmailContent, populateEmailModal, addRecipient) übernehmen aus index.html…
});
