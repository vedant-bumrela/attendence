// ===== DOCTOR MANAGEMENT FUNCTIONS =====

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.tab;
            switchManageView(view);

            // Update active state
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Doctor form
    const doctorForm = document.getElementById('doctorForm');
    if (doctorForm) {
        doctorForm.addEventListener('submit', handleDoctorFormSubmit);
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetDoctorForm);
    }
});

function switchManageView(view) {
    if (view === 'manage') {
        document.getElementById('manageView').style.display = 'block';
        renderDoctorsList();
    }
}

function handleDoctorFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('doctorName').value.trim(),
        days: Array.from(document.querySelectorAll('input[name="days"]:checked')).map(cb => parseInt(cb.value)),
        slots: Array.from(document.querySelectorAll('input[name="slots"]:checked')).map(cb => parseInt(cb.value)),
        timeRange: document.getElementById('timeRange').value.trim()
    };

    // Validation
    if (!formData.name) {
        alert('Please enter doctor name');
        return;
    }

    if (formData.days.length === 0) {
        alert('Please select at least one working day');
        return;
    }

    if (formData.slots.length === 0) {
        alert('Please select at least one time slot');
        return;
    }

    if (!formData.timeRange) {
        alert('Please enter time range');
        return;
    }

    const editIndex = document.getElementById('editIndex').value;

    if (editIndex !== '') {
        // Edit mode
        editDoctor(parseInt(editIndex), formData);
        alert('✅ Doctor updated successfully!');
    } else {
        // Add mode
        addDoctor(formData);
        alert('✅ Doctor added successfully!');
    }

    resetDoctorForm();
}

function resetDoctorForm() {
    document.getElementById('doctorForm').reset();
    document.getElementById('editIndex').value = '';
    document.getElementById('formTitle').textContent = 'Add New Doctor';
    document.getElementById('submitBtnText').textContent = 'Add Doctor';
    document.getElementById('cancelBtn').style.display = 'none';

    // Reset days to default checked
    document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = true);
}

function renderDoctorsList() {
    const container = document.getElementById('doctorsList');

    if (!container) return;

    if (doctors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p style="font-size: 3rem;">👨‍⚕️</p>
                <p>No doctors added yet. Use the form above to add your first doctor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = doctors.map((doctor, index) => {
        const daysText = doctor.days.map(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d - 1]).join(', ');
        const slotsText = doctor.slots.map(s => `Slot ${s}`).join(', ');

        return `
            <div class="doctor-item">
                <div class="doctor-item-info">
                    <h4>${doctor.name}</h4>
                    <p><strong>Days:</strong> ${daysText}</p>
                    <p><strong>Slots:</strong> ${slotsText}</p>
                    <p><strong>Time:</strong> ${doctor.timeRange}</p>
                </div>
                <div class="doctor-item-actions">
                    <button class="btn-icon btn-edit" onclick="editDoctorForm(${index})">Edit</button>
                    <button class="btn-icon btn-delete" onclick="deleteDoctor(${index})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function editDoctorForm(index) {
    const doctor = doctors[index];

    // Scroll to form
    document.querySelector('.doctor-form-card').scrollIntoView({ behavior: 'smooth' });

    // Fill form
    document.getElementById('doctorName').value = doctor.name;
    document.getElementById('timeRange').value = doctor.timeRange;
    document.getElementById('editIndex').value = index;

    // Update days checkboxes
    document.querySelectorAll('input[name="days"]').forEach(cb => {
        cb.checked = doctor.days.includes(parseInt(cb.value));
    });

    // Update slots checkboxes
    document.querySelectorAll('input[name="slots"]').forEach(cb => {
        cb.checked = doctor.slots.includes(parseInt(cb.value));
    });

    // Update form UI
    document.getElementById('formTitle').textContent = 'Edit Doctor';
    document.getElementById('submitBtnText').textContent = 'Update Doctor';
    document.getElementById('cancelBtn').style.display = 'inline-block';
}
