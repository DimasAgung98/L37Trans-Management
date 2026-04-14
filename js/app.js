import { db } from './firebase-init.js';
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// === UI & STATE MANAGEMENT ===
const ui = {
    init() {
        // Navigation
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                
                const target = e.currentTarget.getAttribute('data-target');
                e.currentTarget.classList.add('active');
                document.getElementById(target).classList.add('active');
                
                if(target === 'calendar-section') {
                    setTimeout(() => appState.calendar.render(), 200); // Re-render if hidden
                }
            });
        });
    },
    openModal(id) {
        document.getElementById(id).classList.add('show');
    },
    closeModal(id) {
        document.getElementById(id).classList.remove('show');
        if(id === 'vehicleModal') {
            document.getElementById('vehicleForm').reset();
            document.getElementById('v_id').value = '';
        }
        if(id === 'bookingModal') {
            document.getElementById('bookingForm').reset();
            document.getElementById('b_id').value = '';
            document.getElementById('calc_duration').innerText = '0 Days';
            document.getElementById('calc_bill').innerText = 'Rp 0';
            document.getElementById('calc_investor').innerText = 'Rp 0';
            document.getElementById('calc_admin').innerText = 'Rp 0';
            document.getElementById('addons-container').innerHTML = `
                <div class="form-row addon-item" style="margin-top:10px;">
                    <div class="col" style="flex:2;">
                        <input type="text" class="addon-desc" placeholder="Addon Name (e.g. Driver)">
                    </div>
                    <div class="col" style="flex:1;">
                        <input type="text" class="addon-cost" value="0" oninput="ui.formatInputCurrency(this); calculator.updateSplit()">
                    </div>
                    <div style="display:flex; align-items:center; justify-content:center;">
                        <i class='bx bx-trash' style="color:var(--danger); cursor:pointer; font-size:20px;" onclick="this.parentElement.parentElement.remove(); calculator.updateSplit()"></i>
                    </div>
                </div>
            `;
        }
        if(id === 'customerModal') {
            document.getElementById('customerForm').reset();
            document.getElementById('c_id').value = '';
        }
        if(id === 'invoiceModal') {
            document.getElementById('invoiceTemplatePopup').innerHTML = '';
        }
    },
    openBreakdown(bId) {
        const b = appState.bookings.find(x => x.id === bId);
        if(!b) return;

        let grossRent = (b.total_bill || 0) - (b.addons || 0) - (b.route_fee || 0) - (b.driver_fee || 0);
        let adminRentShare = grossRent - (b.investor_share || 0);
        let pureNetProfit = adminRentShare - (b.opcost || 0);

        let breakdownHTML = `
            <div style='display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;'>
                <span style="font-size:15px; color:#1e293b;">Total Transaksi (Gross):</span>
                <span style="font-weight:bold; color:#1e293b; font-size:16px;">${ui.formatCurrency(b.total_bill || 0)}</span>
            </div>
            <div style='display:flex; justify-content:space-between; align-items:center; color:#64748b; font-size:13px; margin-bottom: 4px;'>
                <span>Addons Gross (-):</span> <span>${ui.formatCurrency(b.addons || 0)}</span>
            </div>
            <div style='display:flex; justify-content:space-between; align-items:center; color:#64748b; font-size:13px; margin-bottom: 4px;'>
                <span>Route (x ${b.duration_days || 1} Days) (-):</span> <span>${ui.formatCurrency(b.route_fee || 0)}</span>
            </div>
            <div style='display:flex; justify-content:space-between; align-items:center; color:#64748b; font-size:13px; margin-bottom: 8px;'>
                <span>Driver (x ${b.duration_days || 1} Days) (-):</span> <span>${ui.formatCurrency(b.driver_fee || 0)}</span>
            </div>
            <div style='display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 10px; border-radius:6px; font-weight:600; font-size:14px; border:1px solid #e2e8f0;'>
                <span>Pure Rent (Sewa x ${b.duration_days || 1} Days):</span> <span>${ui.formatCurrency(grossRent)}</span>
            </div>

            <hr style='border:1px dashed #cbd5e1; margin:12px 0'>

            <div style='display:flex; justify-content:space-between; align-items:center; color:#d97706; font-size:14px; margin-bottom: 8px;'>
                <span>Investor Share (-):</span> <span style="font-weight:600;">${ui.formatCurrency(b.investor_share || 0)}</span>
            </div>
            <div style='display:flex; justify-content:space-between; align-items:center; background:#e0f2fe; padding:8px 10px; border-radius:6px; border:1px solid #bae6fd;'>
                <span style="color:#0369a1; font-weight:600; font-size:14px;">Admin Rent Share:</span> 
                <span style="color:#0369a1; font-weight:bold;">${ui.formatCurrency(adminRentShare)}</span>
            </div>

            <hr style='border:1px dashed #cbd5e1; margin:12px 0'>

            <div style='display:flex; justify-content:space-between; align-items:center; color:#dc2626; font-size:14px;'>
                <span>Operational Cost (-):</span> <span style="font-weight:600;">${ui.formatCurrency(b.opcost || 0)}</span>
            </div>

            <hr style='border:1px solid #94a3b8; margin:12px 0'>

            <div style='display:flex; justify-content:space-between; align-items:center; font-weight:bold; font-size:18px; color:#1e293b; margin-top:8px;'>
                <span>Pure Net Profit:</span> <span style="color:#10b981;">${ui.formatCurrency(pureNetProfit)}</span>
            </div>
        `;

        document.getElementById('breakdown_title').innerText = "Profit Breakdown: " + b.customer_name;
        document.getElementById('breakdown_content').innerHTML = breakdownHTML;
        this.openModal('breakdownModal');
    },
    addAddonRow() {
        const container = document.getElementById('addons-container');
        const d = document.createElement('div');
        d.className = 'form-row addon-item';
        d.style.marginTop = '10px';
        d.innerHTML = `
            <div class="col" style="flex:2;">
                <input type="text" class="addon-desc" placeholder="Addon Name (e.g. Driver Area B)">
            </div>
            <div class="col" style="flex:1;">
                <input type="text" class="addon-cost" value="0" oninput="ui.formatInputCurrency(this); calculator.updateSplit()">
            </div>
            <div style="display:flex; align-items:center; justify-content:center;">
                <i class='bx bx-trash' style="color:var(--danger); cursor:pointer; font-size:20px;" onclick="this.parentElement.parentElement.remove(); calculator.updateSplit()"></i>
            </div>
        `;
        container.appendChild(d);
    },
    addSettingRoute(name = '', fee = '0') {
        const container = document.getElementById('settings-routes-container');
        const d = document.createElement('div');
        d.className = 'route-item';
        d.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: center; border-bottom: 1px dashed #e3e8ee; padding-bottom: 16px; margin-bottom: 16px; width: 100%;';
        d.innerHTML = `
            <div>
                <label class="saas-label" style="font-size:12px; margin-bottom:4px; display:block;">Route Name</label>
                <input type="text" class="route-name saas-input" placeholder="e.g. Luar Kota" value="${name}">
            </div>
            <div>
                <label class="saas-label" style="font-size:12px; margin-bottom:4px; display:block;">Additional Fee</label>
                <input type="text" class="route-fee saas-input" value="${fee}" oninput="ui.formatInputCurrency(this)">
            </div>
            <div style="display:flex; align-items:flex-end; padding-top:20px;">
                <button type="button" style="background:#fee2e2; color:#ef4444; border:none; border-radius:8px; padding:10px; cursor:pointer;" onclick="this.parentElement.parentElement.remove()"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(d);
    },
    formatCurrency(num) {
        return "Rp " + num.toLocaleString('id-ID');
    },
    formatInputCurrency(el) {
        let val = el.value.replace(/[^0-9]/g, '');
        if (val !== '') {
            el.value = parseInt(val, 10).toLocaleString('id-ID');
        } else {
            el.value = '';
        }
    },
    parseCurrency(str) {
        if (!str) return 0;
        return parseFloat(str.toString().replace(/[^0-9]/g, '')) || 0;
    }
};

const appState = {
    vehicles: [],
    bookings: [],
    customers: [],
    calendar: null
};

// === FIREBASE & BUSINESS LOGIC ===
const firebaseLogic = {
    async verifyPIN() {
        const input = document.getElementById('admin-pin-input').value;
        if(!input) return;
        try {
            const docRef = doc(db, "system", "security");
            const docSnap = await getDoc(docRef);
            let validPin = "123456";
            if(docSnap.exists() && docSnap.data().admin_pin) {
                validPin = docSnap.data().admin_pin;
            } else {
                 await setDoc(docRef, { admin_pin: "123456" });
            }
            
            if(input === validPin) {
                sessionStorage.setItem('admin_unlocked', 'true');
                document.getElementById('pin-gate').style.display = 'none';
                Swal.fire({toast:true, position:'top-end', icon:'success', title:'Unlocked successfully', showConfirmButton:false, timer:1500});
                this.loadDashboard();
            } else {
                Swal.fire('Error', 'Invalid PIN', 'error');
            }
        } catch(e) {
            Swal.fire('Error', 'Could not verify PIN', 'error');
        }
    },
    async loadDashboard() {
        try {
            // Load Settings Configs
            const routeStr = localStorage.getItem('settings_routes') || "Dalam Kota|0\nLuar Kota Ring 1|150000\nLuar Kota Ring 2|350000";
            
            document.getElementById('settings-routes-container').innerHTML = '';
            const routeSelect = document.getElementById('b_route');
            routeSelect.innerHTML = '';
            
            routeStr.split('\n').filter(r => r.trim()).forEach(line => {
                let parts = line.split('|');
                if(parts.length >= 2) {
                    let name = parts[0].trim();
                    let feeVal = parseFloat(parts[1].replace(/[^0-9.-]+/g,"")) || 0;
                    routeSelect.innerHTML += `<option value="${feeVal}" data-fee="${feeVal}">${name} (Rp ${feeVal.toLocaleString('id-ID')})</option>`;
                    ui.addSettingRoute(name, feeVal.toLocaleString('id-ID'));
                }
            });

            // Load Other Settings Fields
            document.getElementById('setting-company').value = localStorage.getItem('settings_company') || 'L37 Trans';
            document.getElementById('setting-tagline').value = localStorage.getItem('settings_tagline') || 'Rent Car & Travel';
            document.getElementById('setting-phone').value = localStorage.getItem('settings_phone') || '+62 812-3456-7890';
            document.getElementById('setting-address').value = localStorage.getItem('settings_address') || 'Jl. Vichy No. 98, Jakarta';
            document.getElementById('setting-bank').value = localStorage.getItem('settings_bank') || 'BCA: 1234567890 a.n L37 Trans';
            document.getElementById('setting-footer').value = localStorage.getItem('settings_footer') || 'Terima kasih atas kepercayaan Anda menyewa kendaraan di tempat kami.';

            // Load Vehicles
            const vSnap = await getDocs(collection(db, "vehicles"));
            appState.vehicles = vSnap.docs.map(d => ({id: d.id, ...d.data()}));
            this.renderVehicles();
            
            // Populate vehicle select in booking modal
            const bVehicleSelect = document.getElementById('b_vehicle');
            bVehicleSelect.innerHTML = '<option value="">Select Unit</option>';
            appState.vehicles.forEach(v => {
                if(v.status === 'available') {
                    bVehicleSelect.innerHTML += `<option value="${v.id}" data-mod="${v.investor_price}" data-sell="${v.selling_price}">${v.name} - ${v.plate}</option>`;
                }
            });

            // Load Customers
            const cSnap = await getDocs(collection(db, "customers"));
            appState.customers = cSnap.docs.map(d => ({id: d.id, ...d.data()}));
            this.renderCustomers();

            // Load Bookings
            const bSnap = await getDocs(collection(db, "bookings"));
            appState.bookings = bSnap.docs.map(d => ({id: d.id, ...d.data()}));
            this.renderBookings();
            
            // Dashboard Stats
            document.getElementById('stat-total-fleet').innerText = appState.vehicles.length;
            document.getElementById('stat-available-cars').innerText = appState.vehicles.filter(v => v.status === 'available').length;
            document.getElementById('stat-maintenance-cars').innerText = appState.vehicles.filter(v => v.status === 'maintenance').length;
            
            document.getElementById('stat-active-bookings').innerText = appState.bookings.length;
            
            const todayStr = new Date().toISOString().split('T')[0];
            document.getElementById('stat-today-bookings').innerText = appState.bookings.filter(b => b.start_date.startsWith(todayStr)).length;
            document.getElementById('stat-pending-payments').innerText = appState.bookings.filter(b => b.status_payment === 'pending').length;
            
            
            let revenue = appState.bookings.reduce((sum, b) => b.status_payment === 'paid' ? sum + (b.total_bill || 0) : sum, 0);
            document.getElementById('stat-revenue').innerText = ui.formatCurrency(revenue);

            // Informative Dashboard Widgets
            const now = new Date();
            const activeTable = document.getElementById('dash-active-table');
            const pendingTable = document.getElementById('dash-pending-table');
            
            activeTable.innerHTML = '';
            pendingTable.innerHTML = '';
            
            let activeRentalsCount = 0;
            let pendingCount = 0;

            appState.bookings.forEach(b => {
                const start = new Date(b.start_date);
                const end = new Date(b.end_date);
                
                // Active on-road (happening right now and not cancelled)
                if (now >= start && now <= end && b.status_payment !== 'cancelled') {
                    activeRentalsCount++;
                    const returnsIn = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                    let returnBadge = returnsIn <= 0 ? `<span class="badge" style="background: var(--danger); padding: 4px 8px;">Today!</span>` : `In ${returnsIn} Day(s)`;
                    activeTable.innerHTML += `
                        <tr style="border-bottom: 1px dashed var(--border-dark);">
                            <td style="padding: 12px 20px;"><strong>${b.vehicle_name}</strong></td>
                            <td style="padding: 12px 20px;">${b.customer_name}</td>
                            <td style="padding: 12px 20px;">${returnBadge}</td>
                        </tr>
                    `;
                }

                // Pending payments
                if (b.status_payment === 'pending' || b.status_payment === 'on-hold') {
                    pendingCount++;
                    pendingTable.innerHTML += `
                        <tr style="border-bottom: 1px dashed var(--border-dark);">
                            <td style="padding: 12px 20px;"><strong>${b.customer_name}</strong><br><small style="color:var(--text-muted)">${new Date(b.start_date).toLocaleDateString()}</small></td>
                            <td style="padding: 12px 20px;">${b.vehicle_name}</td>
                            <td style="padding: 12px 20px; color: #f39c12; font-weight: 600;">${ui.formatCurrency(b.total_bill)}</td>
                        </tr>
                    `;
                }
            });

            if(activeRentalsCount === 0) activeTable.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--text-muted);">No active rentals right now.</td></tr>`;
            if(pendingCount === 0) pendingTable.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--text-muted);">All clear! No pending payments.</td></tr>`;

            this.renderRevenue();
            initCalendar();
        } catch (error) {
            console.error("Error loading data", error);
            Swal.fire('Error', 'Please configure your Firebase credentials in firebase-init.js', 'error');
        }
    },

    // Vehicle Methods
    async saveVehicle() {
        const id = document.getElementById('v_id').value;
        const data = {
            name: document.getElementById('v_name').value,
            plate: document.getElementById('v_plate').value,
            investor_price: ui.parseCurrency(document.getElementById('v_investor_price').value),
            selling_price: ui.parseCurrency(document.getElementById('v_selling_price').value),
            status: document.getElementById('v_status').value
        };

        try {
            if(id) {
                await updateDoc(doc(db, "vehicles", id), data);
                Swal.fire('Success', 'Vehicle updated', 'success');
            } else {
                await addDoc(collection(db, "vehicles"), data);
                Swal.fire('Success', 'Vehicle added', 'success');
            }
            ui.closeModal('vehicleModal');
            this.loadDashboard();
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async deleteVehicle(id) {
        if(confirm("Are you sure you want to delete this vehicle?")) {
            try {
                await deleteDoc(doc(db, "vehicles", id));
                Swal.fire('Deleted!', 'Vehicle has been deleted.', 'success');
                this.loadDashboard();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    renderVehicles() {
        const tbody = document.querySelector('#vehiclesTable tbody');
        tbody.innerHTML = '';
        appState.vehicles.forEach(v => {
            tbody.innerHTML += `
                <tr>
                    <td>${v.name}</td>
                    <td>${v.plate}</td>
                    <td>${ui.formatCurrency(v.investor_price)}</td>
                    <td>${ui.formatCurrency(v.selling_price)}</td>
                    <td><span class="badge badge-${v.status}">${v.status.toUpperCase()}</span></td>
                    <td style="display: flex; gap: 6px;">
                        <button class="btn btn-primary" style="background:var(--accent);" onclick="appState.viewUnit('${v.id}')" title="View Unit Details"><i class='bx bx-show'></i></button>
                        <button class="btn btn-secondary" onclick="appState.editVehicle('${v.id}')"><i class='bx bx-edit'></i></button>
                        <button class="btn btn-danger" onclick="firebaseLogic.deleteVehicle('${v.id}')"><i class='bx bx-trash'></i></button>
                    </td>
                </tr>
            `;
        });
    },

    // Customer Methods
    async saveCustomer() {
        const id = document.getElementById('c_id').value;
        const data = {
            name: document.getElementById('c_name').value,
            phone: document.getElementById('c_phone').value,
            ktp: document.getElementById('c_ktp').value,
            address: document.getElementById('c_address').value
        };

        try {
            if(id) {
                await updateDoc(doc(db, "customers", id), data);
                Swal.fire('Success', 'Customer updated', 'success');
            } else {
                await addDoc(collection(db, "customers"), data);
                Swal.fire('Success', 'Customer added', 'success');
            }
            ui.closeModal('customerModal');
            this.loadDashboard();
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async deleteCustomer(id) {
        if(confirm("Are you sure you want to delete this customer?")) {
            try {
                await deleteDoc(doc(db, "customers", id));
                Swal.fire('Deleted!', 'Customer has been deleted.', 'success');
                this.loadDashboard();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    renderCustomers() {
        const tbody = document.querySelector('#customersTable tbody');
        const datalist = document.getElementById('customers_list');
        tbody.innerHTML = '';
        datalist.innerHTML = '';
        
        appState.customers.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone}</td>
                    <td>${c.ktp || '-'}</td>
                    <td>${c.address || '-'}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="appState.editCustomer('${c.id}')"><i class='bx bx-edit'></i></button>
                        <button class="btn btn-danger" onclick="firebaseLogic.deleteCustomer('${c.id}')"><i class='bx bx-trash'></i></button>
                    </td>
                </tr>
            `;
            // Add to datalist
            datalist.innerHTML += `<option value="${c.name}"></option>`;
        });
    },

    // Booking Methods (CONFLICT DETECTION & INVOICE)
    async saveBooking() {
        const id = document.getElementById('b_id').value;
        const customer = document.getElementById('b_customer').value;
        const v_id = document.getElementById('b_vehicle').value;
        const start = document.getElementById('b_start').value;
        const end = document.getElementById('b_end').value;
        const paymentStat = document.getElementById('b_payment_status').value;
        const route_fee = parseFloat(document.getElementById('b_route').selectedOptions[0].dataset.fee);
        
        let addons_list = [];
        let addonsSum = 0;
        let addonsDescList = [];

        document.querySelectorAll('#addons-container .addon-item').forEach(item => {
            const desc = item.querySelector('.addon-desc').value.trim();
            const costText = item.querySelector('.addon-cost').value;
            const cost = parseFloat(ui.parseCurrency(costText || '0'));
            if(desc || cost > 0) {
                addons_list.push({ desc: desc || 'Addon', cost: cost });
                addonsSum += cost;
                if(desc) addonsDescList.push(desc);
            }
        });

        const addons_desc = addonsDescList.length > 0 ? addonsDescList.join(', ') : '';
        const customRentRaw = parseFloat(ui.parseCurrency(document.getElementById('b_custom_rent').value || '0'));
        
        const route_fee_per_day = parseFloat(document.getElementById('b_route').selectedOptions[0].dataset.fee || 0);
        const driver_fee_per_day = parseFloat(ui.parseCurrency(document.getElementById('b_driver_fee').value || '0'));
        if(!v_id || !start || !end || !customer) {
            Swal.fire('Warning', 'Complete all required fields!', 'warning');
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if(startDate >= endDate) {
            Swal.fire('Warning', 'End Date must be after Start Date!', 'warning');
            return;
        }

        // CONFLICT DETECTION ALGORITHM (Anti-Double Booking)
        // Skip conflict detection for itself if it's an update
        const q = query(collection(db, "bookings"), where("vehicle_id", "==", v_id));
        const snapshots = await getDocs(q);
        
        let hasConflict = false;
        snapshots.forEach(docSnap => {
            if(id && docSnap.id === id) return; // ignore current
            
            const existing = docSnap.data();
            const exStart = new Date(existing.start_date);
            const exEnd = new Date(existing.end_date);
            
            if(startDate < exEnd && endDate > exStart) {
                hasConflict = true;
            }
        });

        if(hasConflict) {
            Swal.fire({
                icon: 'error',
                title: 'Conflict Detected',
                text: 'The selected vehicle is already booked during this time-frame!',
                background: '#FFFFFF', color: '#e74c3c'
            });
            return;
        }
        
        // Finalize state via calculator module data
        const calcData = calculator.getCalculations();

        const data = {
            customer_name: customer,
            vehicle_id: v_id,
            vehicle_name: document.getElementById('b_vehicle').selectedOptions[0].text,
            start_date: start,
            end_date: end,
            trip_destination: document.getElementById('b_trip_destination').value.trim() || '',
            duration_days: calcData.days,
            route_fee_per_day: route_fee_per_day,
            route_fee: calcData.routeFeeTotal, // multiplied by duration
            driver_fee_per_day: driver_fee_per_day,
            driver_fee: calcData.driverFeeTotal, // multiplied by duration
            addons: addonsSum,
            addons_desc: addons_desc,
            addons_list: addons_list,
            opcost: calcData.opcost,
            total_bill: calcData.totalBill,
            investor_share: calcData.investorShare,
            admin_profit: calcData.adminNetProfit,
            custom_rent_price: customRentRaw > 0 ? customRentRaw : 0,
            status_payment: paymentStat,
            updated_at: new Date().toISOString()
        };

        try {
            if(id) {
                await updateDoc(doc(db, "bookings", id), data);
                Swal.fire('Success', 'Booking Updated', 'success');
            } else {
                data.created_at = new Date().toISOString();
                await addDoc(collection(db, "bookings"), data);
                Swal.fire('Success', 'Booking Added & Locked in System', 'success');
            }
            ui.closeModal('bookingModal');
            this.loadDashboard();
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async deleteBooking(id) {
        if(confirm("Are you sure you want to delete this booking record?")) {
            try {
                await deleteDoc(doc(db, "bookings", id));
                Swal.fire('Deleted!', 'Booking has been deleted.', 'success');
                this.loadDashboard();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async updatePaymentStatus(id, status) {
        try {
            await updateDoc(doc(db, "bookings", id), {
                status_payment: status,
                updated_at: new Date().toISOString()
            });
            
            // Subtle toast notification for quick actions Let's use standard Swal for simplicity
            Swal.fire({
                title: 'Updated!',
                text: 'Payment is now ' + status.toUpperCase(),
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
            
            this.loadDashboard();
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    renderBookings() {
        const tbody = document.querySelector('#bookingsTable tbody');
        tbody.innerHTML = '';
        appState.bookings.forEach(b => {
            tbody.innerHTML += `
                <tr>
                    <td>${b.customer_name}</td>
                    <td>${b.vehicle_name}</td>
                    <td>${b.duration_days.toFixed(1)} Days</td>
                    <td class="accent-text">${ui.formatCurrency(b.total_bill)}</td>
                    <td><span class="badge ${b.status_payment === 'paid' ? 'badge-available' : (b.status_payment === 'pending' || b.status_payment === 'on-hold' ? 'badge-maintenance' : '')}">${b.status_payment ? b.status_payment.toUpperCase() : 'N/A'}</span></td>
                    <td style="display: flex; gap: 6px;">
                        ${b.status_payment !== 'paid' 
                            ? `<button class="btn btn-primary" style="background:#27ae60" onclick="firebaseLogic.updatePaymentStatus('${b.id}', 'paid')" title="Mark as Paid"><i class='bx bx-check-double'></i></button>`
                            : `<button class="btn btn-secondary" onclick="firebaseLogic.updatePaymentStatus('${b.id}', 'pending')" title="Revert to Pending"><i class='bx bx-undo'></i></button>`
                        }
                        <button class="btn btn-secondary" onclick="appState.editBooking('${b.id}')"><i class='bx bx-edit'></i></button>
                        <button class="btn btn-danger" onclick="firebaseLogic.deleteBooking('${b.id}')"><i class='bx bx-trash'></i></button>
                        <button class="btn btn-primary" onclick="invoiceGenerator.generate('${b.id}')"><i class='bx bxs-file-pdf'></i> Invoice</button>
                    </td>
                </tr>
            `;
        });
    },

    renderRevenue() {
        const tbody = document.querySelector('#revenueTable tbody');
        tbody.innerHTML = '';
        
        let totalOmzet = 0;
        let totalInvestor = 0;
        let totalAdmin = 0;

        // Only process paid bookings
        const paidBookings = appState.bookings.filter(b => b.status_payment === 'paid');

        paidBookings.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(b => {
            let grossRent = (b.total_bill || 0) - (b.addons || 0) - (b.route_fee || 0) - (b.driver_fee || 0);
            let adminRentShare = grossRent - (b.investor_share || 0);
            let pureNetProfit = adminRentShare - (b.opcost || 0);

            totalOmzet += (b.total_bill || 0); // Include addons internally for OMZET (Gross)
            totalInvestor += (b.investor_share || 0);
            totalAdmin += pureNetProfit; // Only calculate pure net profit

            let dateObj = new Date(b.created_at || b.start_date);
            let dateStr = dateObj.toLocaleDateString('id-ID');

            tbody.innerHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${b.customer_name}</strong><br><small style="color:var(--text-muted)">${b.vehicle_name}</small></td>
                    <td class="accent-text" style="color:#27ae60;">${ui.formatCurrency(b.addons || 0)}</td>
                    <td class="accent-text" style="color:#0ea5e9;">${ui.formatCurrency(b.route_fee || 0)}</td>
                    <td style="color:#f39c12">${ui.formatCurrency(b.investor_share || 0)}</td>
                    <td style="color:var(--text-main); font-weight:600; cursor:pointer;" onclick="ui.openBreakdown('${b.id}')" title="Click to view breakdown">
                        <span style="border-bottom: 1px dashed var(--text-main);">${ui.formatCurrency(pureNetProfit)}</span> <i class='bx bx-info-circle' style="color:#64748b; font-size:16px; vertical-align:middle;"></i>
                    </td>
                    <td><button class="btn btn-danger" style="padding: 2px 6px;" onclick="firebaseLogic.deleteBooking('${b.id}')"><i class='bx bx-trash'></i></button></td>
                </tr>
            `;
        });

        document.getElementById('rev-total-omzet').innerText = ui.formatCurrency(totalOmzet);
        document.getElementById('rev-total-investor').innerText = ui.formatCurrency(totalInvestor);
        document.getElementById('rev-total-profit').innerText = ui.formatCurrency(totalAdmin);
    },

    async saveSettings() {
        const saveBtn = document.getElementById('save-btn');
        const oldText = saveBtn.innerHTML;
        saveBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Saving...";
        saveBtn.disabled = true;

        let routesArray = [];
        document.querySelectorAll('#settings-routes-container .route-item').forEach(item => {
            const name = item.querySelector('.route-name').value.trim();
            const fee = ui.parseCurrency(item.querySelector('.route-fee').value || '0');
            if(name) routesArray.push(`${name}|${fee}`);
        });

        localStorage.setItem('settings_company', document.getElementById('setting-company').value);
        localStorage.setItem('settings_tagline', document.getElementById('setting-tagline').value);
        localStorage.setItem('settings_phone', document.getElementById('setting-phone').value);
        localStorage.setItem('settings_address', document.getElementById('setting-address').value);
        localStorage.setItem('settings_bank', document.getElementById('setting-bank').value);
        localStorage.setItem('settings_footer', document.getElementById('setting-footer').value);
        localStorage.setItem('settings_routes', routesArray.join('\n'));

        // Handle PIN
        const newPin = document.getElementById('setting-pin').value;
        if(newPin.length > 0) {
            if(newPin.length < 6) {
                return Swal.fire('Error', 'PIN must be at least 6 characters', 'error');
            }
            try {
                await setDoc(doc(db, "system", "security"), { admin_pin: newPin }, {merge: true});
            } catch(e) {
                console.error("Failed saving PIN to firebase", e);
            }
        }
        document.getElementById('setting-pin').value = '';

        setTimeout(() => {
            saveBtn.innerHTML = oldText;
            saveBtn.disabled = false;
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Configuration saved successfully', showConfirmButton:false, timer:2000});
            this.loadDashboard();
        }, 800);
    }
};

// === PROFIT SPLIT CALCULATOR LOGIC ===
const calculator = {
    updateSplit() {
        const vSelect = document.getElementById('b_vehicle');
        const start = document.getElementById('b_start').value;
        const end = document.getElementById('b_end').value;
        
        if(!vSelect.value || !start || !end) return;

        const modPrice = parseFloat(vSelect.selectedOptions[0].dataset.mod);
        let sellPrice = parseFloat(vSelect.selectedOptions[0].dataset.sell);
        
        const customRentRaw = parseFloat(ui.parseCurrency(document.getElementById('b_custom_rent').value || '0'));
        if(customRentRaw > 0) sellPrice = customRentRaw;
        
        const routeFeePerDay = parseFloat(document.getElementById('b_route').selectedOptions[0].dataset.fee || 0);
        const driverFeePerDay = parseFloat(ui.parseCurrency(document.getElementById('b_driver_fee').value || '0'));
        let addonsSum = 0;
        document.querySelectorAll('#addons-container .addon-cost').forEach(el => {
            addonsSum += parseFloat(ui.parseCurrency(el.value || '0'));
        });

        const addons = addonsSum;
        const opcost = ui.parseCurrency(document.getElementById('b_opcost').value || '0');

        // Calc Duration (Inclusive Days)
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Normalize time to midnight so time differences don't affect full day math
        startDate.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);

        let diffMs = endDate.getTime() - startDate.getTime();
        if(diffMs < 0) diffMs = 0;
        
        // +1 to make it inclusive (e.g. 1 Jan to 2 Jan = 2 days)
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculations
        const routeFeeTotal = routeFeePerDay * days;
        const driverFeeTotal = driverFeePerDay * days;

        const baseBill = sellPrice * days;
        const totalBill = baseBill + addons + routeFeeTotal + driverFeeTotal;
        
        const investorShare = modPrice * days;
        const adminNetProfit = totalBill - investorShare - opcost;

        // UI Update
        document.getElementById('calc_duration').innerText = days.toFixed(2) + " Days";
        document.getElementById('calc_bill').innerText = ui.formatCurrency(totalBill);
        document.getElementById('calc_investor').innerText = ui.formatCurrency(investorShare);
        document.getElementById('calc_admin').innerText = ui.formatCurrency(adminNetProfit);

        this.currentData = { days, totalBill, investorShare, adminNetProfit, addons, opcost, routeFeeTotal, driverFeeTotal };
    },
    getCalculations() {
        return this.currentData || { days:0, totalBill:0, investorShare:0, adminNetProfit:0, addons:0, opcost:0 };
    }
};

// === INVOICE GENERATOR ===
const invoiceGenerator = {
    generate(bookingId) {
        const b = appState.bookings.find(x => x.id === bookingId);
        if(!b) return;

        const cName = localStorage.getItem('settings_company') || 'L37 Trans';
        const tagline = localStorage.getItem('settings_tagline') || 'Rent Car & Travel';
        const phone = localStorage.getItem('settings_phone') || '+62 812-3456-7890';
        const cAddress = localStorage.getItem('settings_address') || 'Jl. Vichy No. 98, Jakarta';
        const bank = localStorage.getItem('settings_bank') || 'BCA: 1234567890 a.n L37 Trans';
        const tnc = localStorage.getItem('settings_footer') || 'Thank You';

        const invHtml = `
            <style>
                .invoice-print {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    background: white;
                    font-family: 'Inter', sans-serif;
                    color: #1e293b;
                    box-sizing: border-box;
                    line-height: 1.5;
                    transform: scale(0.85);
                    transform-origin: top center;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                }
                .invoice-print .header {
                    display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #0f766e; padding-bottom: 20px;
                }
                .invoice-print table {
                    width: 100%; border-collapse: collapse; margin-bottom: 40px;
                }
                .invoice-print th, .invoice-print td {
                    padding: 12px 16px; border: 1px solid #e2e8f0; text-align: left;
                }
                .invoice-print th { background: #f8fafc; color: #64748b; font-weight: 600; text-transform: uppercase; font-size:12px; letter-spacing:0.5px; }
                .invoice-print td { font-size: 14px; }
                .invoice-print tr.total td { background: #f1f5f9; font-weight: bold; font-size:20px; color:#0f766e; border-top: 2px solid #cbd5e1; }
                
                @media print {
                    .invoice-print { transform: scale(1); box-shadow: none; width: 210mm; padding: 20mm; margin: 0; }
                    /* Prevent breaking inside tables/rows */
                    table { page-break-inside: auto; }
                    tr    { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
            
            <div class="invoice-print">
                <div class="header">
                    <div>
                        <h1 style="color: #0f766e; margin: 0 0 5px 0; font-size:32px; font-weight:800;">${cName}</h1>
                        <p style="margin: 0; color: #64748b; font-size: 14px; font-weight:500;">${tagline}</p>
                        <div style="margin-top: 15px; font-size:13px; color:#475569; line-height:1.6;">
                            <strong>Phone/WA:</strong> ${phone}<br>
                            <strong>Location:</strong> ${cAddress}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; color:#cbd5e1; font-size:28px; text-transform:uppercase; letter-spacing:3px;">Invoice</h2>
                        <p style="margin:8px 0 0 0; color:#475569; font-size:14px;">ID: <strong>#${b.id.substring(0,8).toUpperCase()}</strong></p>
                        <p style="margin:4px 0 0 0; color:#475569; font-size:14px;">Date: ${new Date().toLocaleDateString('id-ID')}</p>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 40px; gap:20px;">
                    <div style="flex:1; background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform:uppercase; color:#94a3b8; letter-spacing:1px;">Billed To</h3>
                        <p style="margin:0; font-size:18px; color:#1e293b; font-weight:700;">${b.customer_name}</p>
                    </div>
                    <div style="flex:1; background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #e2e8f0; text-align:right;">
                        <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform:uppercase; color:#94a3b8; letter-spacing:1px;">Vehicle / Booking</h3>
                        <p style="margin:0; font-size:18px; color:#0f766e; font-weight:700;">${b.vehicle_name}</p>
                        <p style="margin:8px 0 0 0; color:#475569; font-size:14px;">Period: ${new Date(b.start_date).toLocaleDateString('id-ID')} - ${new Date(b.end_date).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>

                <table>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                    ${(() => {
                        const invType = document.getElementById('invoice_type') ? document.getElementById('invoice_type').value : 'exclude';
                        const days = (b.duration_days || 0).toFixed(1);
                        const driverFee = b.driver_fee || 0;
                        const routeFee = b.route_fee || 0;
                        const addons = b.addons || 0;
                        const baseRent = b.total_bill - driverFee - routeFee - addons;
                        const destText = b.trip_destination ? ` (${b.trip_destination})` : '';

                        if (invType === 'include') {
                            return `
                                <tr>
                                    <td>Sewa Kendaraan + Driver + BBM/Tol + Area${destText}</td>
                                    <td style="text-align:right; font-weight:500;">${ui.formatCurrency(b.total_bill)}</td>
                                </tr>
                            `;
                        } else {
                            let rows = `
                                <tr>
                                    <td>Base Rent (${days} Days)</td>
                                    <td style="text-align:right; font-weight:500;">${ui.formatCurrency(baseRent)}</td>
                                </tr>
                            `;
                            if(driverFee > 0) {
                                rows += `<tr><td>Driver Fee (${days} Days)</td><td style="text-align:right; font-weight:500;">${ui.formatCurrency(driverFee)}</td></tr>`;
                            }
                            if(routeFee > 0 || b.trip_destination) {
                                rows += `<tr><td>Route Area Fee${destText}</td><td style="text-align:right; font-weight:500;">${ui.formatCurrency(routeFee)}</td></tr>`;
                            }
                            if(b.addons_list && b.addons_list.length > 0) {
                                rows += b.addons_list.map(a => `<tr><td>Addon: ${a.desc}</td><td style="text-align:right; font-weight:500;">${ui.formatCurrency(a.cost)}</td></tr>`).join('');
                            } else if(addons > 0) {
                                rows += `<tr><td>Addons: ${b.addons_desc || 'Extras'}</td><td style="text-align:right; font-weight:500;">${ui.formatCurrency(addons)}</td></tr>`;
                            }
                            return rows;
                        }
                    })()}
                    <tr class="total">
                        <td style="text-align:right; padding-right:20px; text-transform:uppercase; font-size:14px;">Grand Total</td>
                        <td style="text-align:right;">${ui.formatCurrency(b.total_bill)}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 40px; padding: 24px; background: #e0f2fe; border-left: 6px solid #0284c7; border-radius:8px;">
                    <h4 style="margin:0 0 12px 0; color:#0369a1; font-size:15px; letter-spacing:0.5px;">Payment Instructions</h4>
                    <p style="margin:0; white-space: pre-line; font-size: 15px; color:#0f172a; font-weight:500; font-family:monospace;">${bank}</p>
                </div>

                <div style="margin-top:60px; text-align:center; color:#94a3b8; font-size:13px; border-top:1px solid #e2e8f0; padding-top:24px;">
                    <p>${tnc}</p>
                </div>
            </div>
        `;
        
        appState.currentInvoiceCustomer = b.customer_name.replace(/\s+/g, '-');
        appState.currentInvoiceId = b.id;
        document.getElementById('invoiceTemplatePopup').innerHTML = invHtml;
        ui.openModal('invoiceModal');
    },
    _generatePDFBlob() {
        return new Promise((resolve) => {
            const b = appState.bookings.find(x => x.id === appState.currentInvoiceId);
            if(!b) return resolve(null);

            const cust = appState.currentInvoiceCustomer || 'Guest';
            const cName = localStorage.getItem('settings_company') || 'L37 Trans';
            const tagline = localStorage.getItem('settings_tagline') || 'Rent Car & Travel';
            const phone = localStorage.getItem('settings_phone') || '+62 812-3456-7890';
            const cAddress = localStorage.getItem('settings_address') || 'Jl. Vichy No. 98, Jakarta';
            const bank = localStorage.getItem('settings_bank') || 'BCA: 1234567890 a.n L37 Trans';
            const tnc = localStorage.getItem('settings_footer') || 'Thank You';

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // ── HEADER ──
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(15, 118, 110);
            doc.text(cName, 20, 25);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(tagline, 20, 31);
            
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(`Phone/WA: ${phone}`, 20, 37);
            doc.text(`Location: ${cAddress}`, 20, 42);

            // Title Right
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(203, 213, 225);
            doc.text("INVOICE", 190, 25, { align: 'right' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(`ID: #${b.id.substring(0,8).toUpperCase()}`, 190, 31, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString('id-ID')}`, 190, 36, { align: 'right' });

            // Line Separator
            doc.setDrawColor(15, 118, 110);
            doc.setLineWidth(0.5);
            doc.line(20, 48, 190, 48);

            // ── CUSTOMER & VEHICLE BOXES ──
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.roundedRect(20, 56, 75, 25, 2, 2, 'FD');
            doc.roundedRect(110, 56, 80, 25, 2, 2, 'FD');

            // Left Box
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("BILLED TO", 25, 63);
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.setFont("helvetica", "bold");
            doc.text(b.customer_name, 25, 71);

            // Right Box
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text("VEHICLE / BOOKING", 185, 63, { align: 'right' });
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 118, 110);
            doc.text(b.vehicle_name, 185, 71, { align: 'right' });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(`Period: ${new Date(b.start_date).toLocaleDateString('id-ID')} - ${new Date(b.end_date).toLocaleDateString('id-ID')}`, 185, 77, { align: 'right' });

            // ── TABLE LOGIC ──
            const invType = document.getElementById('invoice_type') ? document.getElementById('invoice_type').value : 'exclude';
            const days = (b.duration_days || 0).toFixed(1);
            const driverFee = b.driver_fee || 0;
            const routeFee = b.route_fee || 0;
            const addons = b.addons || 0;
            const baseRent = b.total_bill - driverFee - routeFee - addons;
            const destText = b.trip_destination ? ` (${b.trip_destination})` : '';

            let tableData = [];
            if (invType === 'include') {
                tableData.push([`Sewa Kendaraan + Driver + BBM/Tol + Area${destText}`, ui.formatCurrency(b.total_bill)]);
            } else {
                tableData.push([`Base Rent (${days} Days)`, ui.formatCurrency(baseRent)]);
                if(driverFee > 0) tableData.push([`Driver Fee (${days} Days)`, ui.formatCurrency(driverFee)]);
                if(routeFee > 0 || b.trip_destination) tableData.push([`Route Area Fee${destText}`, ui.formatCurrency(routeFee)]);
                
                if(b.addons_list && b.addons_list.length > 0) {
                    b.addons_list.forEach(a => tableData.push([`Addon: ${a.desc}`, ui.formatCurrency(a.cost)]));
                } else if(addons > 0) {
                    tableData.push([`Addons: ${b.addons_desc || 'Extras'}`, ui.formatCurrency(addons)]);
                }
            }

            // Draw AutoTable
            doc.autoTable({
                startY: 90,
                head: [['DESCRIPTION', 'AMOUNT']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { textColor: [30, 41, 59], fontSize: 10, cellPadding: 6 },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'right', fontStyle: 'bold' }
                },
                alternateRowStyles: { fillColor: [255, 255, 255] },
                margin: { left: 20, right: 20 }
            });

            // ── TOTAL ROW ──
            const finalY = doc.lastAutoTable.finalY;
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.rect(20, finalY, 170, 12, 'FD');
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("GRAND TOTAL", 130, finalY + 8, { align: 'right' });
            
            doc.setTextColor(15, 118, 110);
            doc.setFontSize(12);
            doc.text(ui.formatCurrency(b.total_bill), 185, finalY + 8, { align: 'right' });

            // ── PAYMENT INSTRUCTIONS ──
            doc.setFillColor(224, 242, 254);
            doc.setDrawColor(2, 132, 199);
            doc.setLineWidth(1.5);
            
            const bankLines = doc.splitTextToSize(bank, 155);
            const pboxY = finalY + 20;
            const pboxHeight = 16 + (bankLines.length * 5);
            
            doc.rect(20, pboxY, 170, pboxHeight, 'F');
            doc.line(20, pboxY, 20, pboxY + pboxHeight); // left blue strip
            
            doc.setFontSize(10);
            doc.setTextColor(3, 105, 161);
            doc.text("Payment Instructions", 26, pboxY + 7);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42);
            doc.text(bankLines, 26, pboxY + 14);

            // ── FOOTER ──
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(tnc, 105, 280, { align: 'center' });

            const blob = doc.output('blob');
            resolve({ blob, filename: `INV-L37-${cust}.pdf` });
        });
    },
    downloadPDF() {
        Swal.fire({ title: 'Generating PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this._generatePDFBlob().then(({ blob, filename }) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            Swal.close();
        });
    },
    shareWhatsApp() {
        const id = appState.currentInvoiceId;
        if(!id) return;
        const b = appState.bookings.find(x => x.id === id);
        if(!b) return;
        
        let message = `*INVOICE L37 TRANS*\nID: #${b.id.substring(0,8).toUpperCase()}\nCustomer: ${b.customer_name}\nUnit: ${b.vehicle_name}\nPeriode: ${new Date(b.start_date).toLocaleDateString('id-ID')} s/d ${new Date(b.end_date).toLocaleDateString('id-ID')}\n\n*Total Tagihan: ${ui.formatCurrency(b.total_bill)}*\n\nTerima kasih telah menggunakan layanan kami.`;
        
        Swal.fire({ title: 'Preparing PDF...', text: 'Please wait...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this._generatePDFBlob().then(async ({ blob, filename }) => {
            Swal.close();
            const file = new File([blob], filename, { type: 'application/pdf' });

            // Check if Native Mobile Share with Files is supported (Android/iOS)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Invoice L37 Trans',
                        text: message
                    });
                } catch (error) {
                    console.log('Share was cancelled or failed.');
                }
            } else {
                // PC / Unsupported Browser Fallback: Download the file and open WA web
                Swal.fire({
                    icon: 'info',
                    title: 'Buka WhatsApp Web',
                    text: 'Browser PC tidak mendukung kirim file otomatis. PDF akan didownload, silakan lampirkan manual di WhatsApp Web yang akan terbuka.',
                    confirmButtonText: 'Lanjutkan',
                    background: '#fff',
                    color: '#1e293b'
                }).then(() => {
                    // Auto download
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    // Open WA Web Text
                    const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                    window.open(waLink, '_blank');
                });
            }
        });
    }
}

// === FULLCALENDAR ===
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    // Map bookings to events
    const events = appState.bookings.map(b => ({
        title: `${b.vehicle_name} (${b.customer_name})`,
        start: b.start_date,
        end: b.end_date,
        backgroundColor: 'rgba(5, 173, 152, 0.1)',
        borderColor: '#05AD98',
        textColor: '#05AD98'
    }));

    if(appState.calendar) {
        appState.calendar.destroy();
    }

    appState.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventClick: function(info) {
            Swal.fire({
                title: info.event.title,
                text: `Booked until: ${info.event.end ? info.event.end.toLocaleString() : info.event.start.toLocaleString()}`,
                background: '#FFFFFF', color: '#05AD98'
            });
        }
    });
    
    // if active, render now
    if(document.getElementById('calendar-section').classList.contains('active')){
         appState.calendar.render();
    }
}


// Export required functions to global window for HTML inline calls
window.ui = ui;
window.firebaseLogic = firebaseLogic;
window.calculator = calculator;
window.invoiceGenerator = invoiceGenerator;
window.appState = appState;

appState.editVehicle = (id) => {
    const v = appState.vehicles.find(x => x.id === id);
    if(v) {
        document.getElementById('v_id').value = v.id;
        document.getElementById('v_name').value = v.name;
        document.getElementById('v_plate').value = v.plate;
        document.getElementById('v_investor_price').value = (v.investor_price || 0).toLocaleString('id-ID');
        document.getElementById('v_selling_price').value = (v.selling_price || 0).toLocaleString('id-ID');
        document.getElementById('v_status').value = v.status;
        ui.openModal('vehicleModal');
    }
}

appState.editCustomer = (id) => {
    const c = appState.customers.find(x => x.id === id);
    if(c) {
        document.getElementById('c_id').value = c.id;
        document.getElementById('c_name').value = c.name;
        document.getElementById('c_phone').value = c.phone;
        document.getElementById('c_ktp').value = c.ktp;
        document.getElementById('c_address').value = c.address;
        ui.openModal('customerModal');
    }
}

appState.editBooking = (id) => {
    const b = appState.bookings.find(x => x.id === id);
    if(b) {
        document.getElementById('b_id').value = b.id;
        document.getElementById('b_customer').value = b.customer_name;
        document.getElementById('b_vehicle').value = b.vehicle_id;
        document.getElementById('b_start').value = b.start_date;
        document.getElementById('b_end').value = b.end_date;
        document.getElementById('b_trip_destination').value = b.trip_destination || '';
        document.getElementById('b_custom_rent').value = b.custom_rent_price && b.custom_rent_price > 0 ? b.custom_rent_price.toLocaleString('id-ID') : '';
        document.getElementById('b_opcost').value = (b.opcost || 0).toLocaleString('id-ID');
        
        // Rebuild Addons Container for Edit
        const container = document.getElementById('addons-container');
        container.innerHTML = '';
        if(b.addons_list && b.addons_list.length > 0) {
            b.addons_list.forEach(a => {
                container.innerHTML += `
                    <div class="form-row addon-item" style="margin-top:10px;">
                        <div class="col" style="flex:2;">
                            <input type="text" class="addon-desc" value="${a.desc}">
                        </div>
                        <div class="col" style="flex:1;">
                            <input type="text" class="addon-cost" value="${a.cost.toLocaleString('id-ID')}" oninput="ui.formatInputCurrency(this); calculator.updateSplit()">
                        </div>
                        <div style="display:flex; align-items:center; justify-content:center;">
                            <i class='bx bx-trash' style="color:var(--danger); cursor:pointer; font-size:20px;" onclick="this.parentElement.parentElement.remove(); calculator.updateSplit()"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            // Default 1 empty row if missing or old data
            const costStr = (b.addons || 0).toLocaleString('id-ID');
            const descStr = b.addons_desc || '';
            container.innerHTML = `
                <div class="form-row addon-item" style="margin-top:10px;">
                    <div class="col" style="flex:2;">
                        <input type="text" class="addon-desc" value="${descStr}" placeholder="Addon Name (e.g. Driver)">
                    </div>
                    <div class="col" style="flex:1;">
                        <input type="text" class="addon-cost" value="${costStr}" oninput="ui.formatInputCurrency(this); calculator.updateSplit()">
                    </div>
                    <div style="display:flex; align-items:center; justify-content:center;">
                        <i class='bx bx-trash' style="color:var(--danger); cursor:pointer; font-size:20px;" onclick="this.parentElement.parentElement.remove(); calculator.updateSplit()"></i>
                    </div>
                </div>
            `;
        }

        const routeSelect = document.getElementById('b_route');
        const rFeeToMatch = b.route_fee_per_day !== undefined ? b.route_fee_per_day : (b.route_fee || 0);
        for(let i=0; i<routeSelect.options.length; i++) {
            if(parseFloat(routeSelect.options[i].dataset.fee) === rFeeToMatch) {
                routeSelect.selectedIndex = i; break;
            }
        }
        
        document.getElementById('b_driver_fee').value = (b.driver_fee_per_day || 0).toLocaleString('id-ID');
        document.getElementById('b_payment_status').value = b.status_payment || 'pending';
        
        ui.openModal('bookingModal');
        calculator.updateSplit(); // Trigger calculation updates
    }
}

appState.viewUnit = (id) => {
    const v = appState.vehicles.find(x => x.id === id);
    if(!v) return;

    document.getElementById('ud_title').innerText = v.name;
    document.getElementById('ud_plate').innerText = v.plate;
    document.getElementById('ud_status').innerHTML = `<span class="badge badge-${v.status}">${v.status.toUpperCase()}</span>`;

    const unitBookings = appState.bookings.filter(b => b.vehicle_id === id);
    document.getElementById('ud_rents').innerText = unitBookings.length;

    const tbody = document.getElementById('ud_bookings_list');
    tbody.innerHTML = '';
    
    let eventsData = [];

    if(unitBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center; color:var(--text-muted);">No booking history for this unit.</td></tr>`;
    } else {
        unitBookings.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(b => {
            const startDateStr = new Date(b.start_date).toLocaleDateString('id-ID');
            const endDateStr = new Date(b.end_date).toLocaleDateString('id-ID');
            eventsData.push({
                title: b.customer_name + ' (' + b.status_payment + ')',
                start: b.start_date,
                end: b.end_date,
                color: b.status_payment === 'paid' ? '#05AD98' : '#f39c12'
            });

            tbody.innerHTML += `
                <tr style="border-bottom:1px solid var(--border-dark);">
                    <td style="padding:10px 15px;"><strong>${b.customer_name}</strong></td>
                    <td style="padding:10px 15px;">${startDateStr} - ${endDateStr}</td>
                    <td style="padding:10px 15px;"><span class="badge ${b.status_payment === 'paid' ? 'badge-available' : 'badge-maintenance'}">${b.status_payment.toUpperCase()}</span></td>
                </tr>
            `;
        });
    }

    ui.openModal('unitDetailModal');

    setTimeout(() => {
        if(appState.unitCalendarInstance) {
            appState.unitCalendarInstance.destroy();
        }
        const calEl = document.getElementById('ud_calendar');
        appState.unitCalendarInstance = new FullCalendar.Calendar(calEl, {
            initialView: 'dayGridMonth',
            height: 380,
            events: eventsData,
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            }
        });
        appState.unitCalendarInstance.render();
    }, 200);
}

// Main Init
document.addEventListener('DOMContentLoaded', () => {
    ui.init();
    if(sessionStorage.getItem('admin_unlocked') === 'true') {
        document.getElementById('pin-gate').style.display = 'none';
        firebaseLogic.loadDashboard();
    } // else pin-gate blocking dashboard loads
});
