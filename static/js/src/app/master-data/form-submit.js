// Submit Create or Edit Form
async function submitMasterDataForm(e) {
    e.preventDefault();
    const editId = document.getElementById('md-edit-id').value;
    const tabKey = document.getElementById('md-catalog-key').value;
    const isEdit = tabKey === 'company' ? true : !!editId;

    const endpoints = {
        'company': '/api/master-data/company/',
        'opening_balance': isEdit ? `/api/master-data/opening-balances/${editId}/` : '/api/master-data/opening-balances/',
        'driver_tariffs': isEdit ? `/api/master-data/driver-tariffs/${editId}/` : '/api/master-data/driver-tariffs/',
        'allowances': isEdit ? `/api/master-data/allowances/${editId}/` : '/api/master-data/allowances/',
        'locations': isEdit ? `/api/master-data/locations/${editId}/` : '/api/master-data/locations/',
        'tariffs': isEdit ? `/api/master-data/tariffs/${editId}/` : '/api/master-data/tariffs/',
        'customers': isEdit ? `/api/master-data/customers/${editId}/` : '/api/master-data/customers/',
        'expenses': isEdit ? `/api/master-data/expense-items/${editId}/` : '/api/master-data/expense-items/',
        'containers': isEdit ? `/api/master-data/container-types/${editId}/` : '/api/master-data/container-types/',
        'vehicles': isEdit ? `/api/master-data/vehicles/${editId}/` : '/api/master-data/vehicles/',
        'trailers': isEdit ? `/api/master-data/trailers/${editId}/` : '/api/master-data/trailers/',
        'shipping_lines': isEdit ? `/api/master-data/shipping-lines/${editId}/` : '/api/master-data/shipping-lines/',
        'subcontractors': isEdit ? `/api/master-data/subcontractors/${editId}/` : '/api/master-data/subcontractors/'
    };

    let payload = {};
    if (tabKey === 'opening_balance') {
        const isDebit = document.getElementById('mdf-ob-type')?.value === 'debit';
        const amount = parseNumberVN(document.getElementById('mdf-ob-amount')?.value) || 0;
        payload = {
            account_code: document.getElementById('mdf-ob-account')?.value || '1111',
            opening_date: document.getElementById('mdf-ob-date')?.value || '2026-01-01',
            entity_name: document.getElementById('mdf-ob-name')?.value || '',
            entity_code: document.getElementById('mdf-ob-code')?.value || '',
            bank_account_number: document.getElementById('mdf-ob-bank-acc')?.value || '',
            debit_amount: isDebit ? amount : 0,
            credit_amount: !isDebit ? amount : 0,
            amount: amount,
            is_debit: isDebit,
            notes: document.getElementById('mdf-ob-notes')?.value || ''
        };
    } else if (tabKey === 'company') {
        payload = {
            company_name: document.getElementById('mdf-cp-name')?.value || '',
            short_name: document.getElementById('mdf-cp-short-name')?.value || '',
            tax_code: document.getElementById('mdf-cp-tax-code')?.value || '',
            operating_license: document.getElementById('mdf-cp-license')?.value || '',
            representative_name: document.getElementById('mdf-cp-rep-name')?.value || '',
            representative_role: document.getElementById('mdf-cp-rep-role')?.value || '',
            address: document.getElementById('mdf-cp-address')?.value || '',
            phone: document.getElementById('mdf-cp-phone')?.value || '',
            email: document.getElementById('mdf-cp-email')?.value || '',
            website: document.getElementById('mdf-cp-website')?.value || '',
            branch_name: document.getElementById('mdf-cp-branch-name')?.value || '',
            branch_address: document.getElementById('mdf-cp-branch-address')?.value || '',
            branch_phone: document.getElementById('mdf-cp-branch-phone')?.value || '',
            fleet_yard_name: document.getElementById('mdf-cp-yard-name')?.value || '',
            fleet_yard_address: document.getElementById('mdf-cp-yard-address')?.value || '',
            fleet_yard_hotline: document.getElementById('mdf-cp-yard-hotline')?.value || '',
            bank_account_number: document.getElementById('mdf-cp-bank-acc')?.value || '',
            bank_name: document.getElementById('mdf-cp-bank-name')?.value || '',
            bank_branch: document.getElementById('mdf-cp-bank-branch')?.value || '',
            default_vat_rate: parseFloat(document.getElementById('mdf-cp-vat')?.value) || 8.0,
            fuel_reference_price: parseNumberVN(document.getElementById('mdf-cp-fuel-price')?.value) || 21000,
            cbm_formula_divisor: parseInt(document.getElementById('mdf-cp-cbm-divisor')?.value) || 5000,
            notes: document.getElementById('mdf-cp-notes')?.value || '',
        };
    } else if (tabKey === 'driver_tariffs') {
        payload = {
            area_group: document.getElementById('mdf-area-group').value,
            route_name: document.getElementById('mdf-route-name').value,
            pickup_drop_area: document.getElementById('mdf-pickup-drop')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            salary_rate: parseNumberVN(document.getElementById('mdf-salary-rate').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'allowances') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            amount: parseNumberVN(document.getElementById('mdf-amount').value) || 0,
            notes: document.getElementById('mdf-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'locations') {
        payload = {
            code: document.getElementById('mdf-code').value,
            location_type: document.getElementById('mdf-location-type').value,
            name: document.getElementById('mdf-name').value,
            province: document.getElementById('mdf-province').value,
            address: document.getElementById('mdf-address').value,
            contact_person: document.getElementById('mdf-contact-person')?.value || '',
            contact_phone: document.getElementById('mdf-contact-phone').value,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'customers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            tax_code: document.getElementById('mdf-tax-code').value,
            customer_group: document.getElementById('mdf-customer-group')?.value || 'COMMERCIAL_TRADING',
            name: document.getElementById('mdf-name').value,
            short_name: document.getElementById('mdf-short-name')?.value?.trim() || '',
            address: document.getElementById('mdf-address').value,
            company_email: document.getElementById('mdf-company-email')?.value?.trim() || '',
            contact_person: document.getElementById('mdf-contact-person')?.value?.trim() || '',
            contact_title: document.getElementById('mdf-contact-title')?.value?.trim() || '',
            contact_email: document.getElementById('mdf-contact-email')?.value?.trim() || '',
            phone: document.getElementById('mdf-phone').value,
            bank_account_number: document.getElementById('mdf-bank-acc')?.value?.trim() || '',
            bank_name: document.getElementById('mdf-bank-name')?.value?.trim() || '',
            bank_branch: document.getElementById('mdf-bank-branch')?.value?.trim() || '',
            bank_account_holder: document.getElementById('mdf-bank-holder')?.value?.trim() || '',
            payment_term_days: parseInt(document.getElementById('mdf-payment-term')?.value) || 30,
            credit_limit: (typeof parseNumberVN === 'function') ? (parseNumberVN(document.getElementById('mdf-credit-limit')?.value) || 0) : 0,
            notes: document.getElementById('mdf-notes')?.value || ''
        };
    } else if (tabKey === 'tariffs') {
        payload = {
            customer_id: document.getElementById('mdf-customer-id').value,
            origin_zone: document.getElementById('mdf-origin-zone')?.value || '',
            destination_zone: document.getElementById('mdf-dest-zone')?.value || '',
            estimated_km: parseNumberVN(document.getElementById('mdf-estimated-km')?.value) || 0,
            pickup_location: document.getElementById('mdf-pickup').value,
            delivery_location: document.getElementById('mdf-delivery').value,
            dropoff_location: document.getElementById('mdf-dropoff').value,
            container_size: document.getElementById('mdf-container-size')?.value || '40HC',
            freight_price: parseNumberVN(document.getElementById('mdf-price').value) || 0,
            driver_trip_pay: parseNumberVN(document.getElementById('mdf-pay').value) || 0,
            toll_standard_fee: parseNumberVN(document.getElementById('mdf-toll')?.value || 0) || 0
        };
    } else if (tabKey === 'expenses') {
        payload = {
            code: document.getElementById('mdf-code').value,
            group_type: document.getElementById('mdf-group-type').value,
            name: document.getElementById('mdf-name').value,
            default_amount: parseNumberVN(document.getElementById('mdf-default-amount').value) || 0,
            requires_invoice: document.getElementById('mdf-requires-invoice').checked,
            notes: document.getElementById('mdf-notes')?.value || '',
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'containers') {
        payload = {
            code: document.getElementById('mdf-code').value,
            category: document.getElementById('mdf-category').value,
            name: document.getElementById('mdf-name').value,
            teu_factor: parseFloat(document.getElementById('mdf-teu').value) || 2.0,
            max_payload_kg: parseNumberVN(document.getElementById('mdf-payload').value) || 0,
            cbm_capacity: parseFloat(document.getElementById('mdf-cbm').value) || 0,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'vehicles') {
        const subIdVal = document.getElementById('mdf-subcontractor-id')?.value;
        payload = {
            license_plate: document.getElementById('mdf-license-plate').value,
            ownership_type: document.getElementById('mdf-ownership').value,
            subcontractor_id: (document.getElementById('mdf-ownership').value === 'SUBCONTRACTOR' && subIdVal) ? parseInt(subIdVal) : null,
            vehicle_type: document.getElementById('mdf-vehicle-type').value,
            brand: document.getElementById('mdf-brand').value,
            payload_capacity_kg: document.getElementById('mdf-payload').value.trim(),
            current_driver_id: document.getElementById('mdf-driver-id')?.value ? parseInt(document.getElementById('mdf-driver-id').value) : null,
            registration_expiry: document.getElementById('mdf-reg-expiry')?.value || null,
            insurance_expiry: document.getElementById('mdf-ins-expiry')?.value || null,
            next_maintenance_date: document.getElementById('mdf-maint-date')?.value || null,
            status: document.getElementById('mdf-vehicle-status')?.value || 'IDLE'
        };
    } else if (tabKey === 'trailers') {
        const selTrailerType = document.getElementById('mdf-trailer-type')?.value || '';
        const customTrailerType = document.getElementById('mdf-trailer-type-custom')?.value?.trim() || '';
        const finalTrailerType = (selTrailerType === '__OTHER__') ? (customTrailerType || 'Loại moóc khác') : selTrailerType;
        if (selTrailerType === '__OTHER__' && !customTrailerType) {
            showToast('warning', 'Vui lòng nhập tên loại rơ-moóc cụ thể!');
            document.getElementById('mdf-trailer-type-custom')?.focus();
            return;
        }
        payload = {
            license_plate: document.getElementById('mdf-trailer-plate').value.trim().toUpperCase(),
            trailer_type: finalTrailerType,
            brand: document.getElementById('mdf-trailer-brand').value.trim(),
            payload_capacity_kg: document.getElementById('mdf-trailer-payload').value.trim(),
            registration_expiry: document.getElementById('mdf-trailer-expiry').value || null,
            status: document.getElementById('mdf-trailer-status').value
        };
    } else if (tabKey === 'shipping_lines') {
        payload = {
            code: document.getElementById('mdf-sl-code').value,
            name: document.getElementById('mdf-sl-name').value,
            contact_phone: document.getElementById('mdf-sl-phone').value,
            contact_email: document.getElementById('mdf-sl-email').value,
            website: document.getElementById('mdf-sl-web').value,
            free_dem_days: parseInt(document.getElementById('mdf-sl-dem').value || 7),
            free_det_days: parseInt(document.getElementById('mdf-sl-det').value || 5),
            notes: document.getElementById('mdf-sl-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    } else if (tabKey === 'subcontractors') {
        payload = {
            partner_type: document.getElementById('mdf-sc-partner-type')?.value || 'CARRIER',
            code: document.getElementById('mdf-sc-code').value,
            short_name: document.getElementById('mdf-sc-short-name')?.value || '',
            tax_code: document.getElementById('mdf-sc-tax').value,
            name: document.getElementById('mdf-sc-name').value,
            contact_person: document.getElementById('mdf-sc-person').value,
            phone: document.getElementById('mdf-sc-phone').value,
            address: document.getElementById('mdf-sc-address').value,
            yard_address: document.getElementById('mdf-sc-yard-address')?.value || '',
            bank_account_number: document.getElementById('mdf-sc-acc').value,
            bank_name: document.getElementById('mdf-sc-bank').value,
            bank_account_holder: document.getElementById('mdf-sc-holder').value,
            notes: document.getElementById('mdf-sc-notes').value,
            is_active: document.getElementById('mdf-is-active')?.checked ?? true
        };
    }

    try {
        const res = await fetchWithAuth(endpoints[tabKey], {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success || data.id)) {
            if (tabKey === 'subcontractors') {
                const subId = editId || data.id || (data.data && data.data.id);
                if (subId && typeof saveAllSubcontractorFleetInlineChanges === 'function') {
                    await saveAllSubcontractorFleetInlineChanges(subId);
                }
            }
            showToast('success', data.message || 'Lưu bản ghi thành công!');
            closeMasterDataModal();

            if (tabKey === 'company') {
                if (data.data) {
                    if (typeof masterDataCache !== 'undefined') {
                        masterDataCache['company'] = data.data;
                    }
                    window.SYSTEM_COMPANY = data.data;
                }
                syncCompanyProfileToPrintForms();
                if (typeof loadCompanyProfile === 'function') {
                    loadCompanyProfile();
                }
                return;
            }

            if (typeof currentTab !== 'undefined' && currentTab === 'cai-dat') {
                loadMasterData();
            }
            if (tabKey === 'vehicles' || tabKey === 'trailers') {
                if (typeof loadFleetData === 'function') loadFleetData();
            }

            // Tự động tải lại danh mục cho các Modal đang mở và chọn ngay bản ghi vừa tạo
            await loadMasterDataFormOptions(true);
            populateMasterDataDropdowns();

            if (typeof quickMasterDataTargetSelectId !== 'undefined' && quickMasterDataTargetSelectId) {
                const targetEl = document.getElementById(quickMasterDataTargetSelectId);
                const createdName = payload.name || payload.code || payload.license_plate || payload.route_name || '';
                if (targetEl && createdName) {
                    if (targetEl.tagName === 'SELECT') {
                        setSelectValueCaseInsensitive(targetEl, createdName);
                    } else {
                        targetEl.value = createdName;
                    }
                    if (typeof targetEl.onchange === 'function') {
                        targetEl.onchange();
                    }
                }
                quickMasterDataTargetSelectId = null;
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra khi lưu dữ liệu!');
        }
    } catch (err) {
        console.error('Lỗi submitMasterDataForm:', err);
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// Delete Item (Soft-delete)
async function deleteMasterDataItem(id) {
    const confirmed = await showConfirmModal({
        title: 'Xóa Danh Mục',
        message: 'Bạn có chắc chắn muốn xóa bản ghi này khỏi danh mục không?\n\nDữ liệu lịch sử sẽ được bảo lưu an toàn (Soft-Delete).',
        confirmText: 'Xóa Bản Ghi',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    const endpoints = {
        'driver_tariffs': `/api/master-data/driver-tariffs/${id}/`,
        'allowances': `/api/master-data/allowances/${id}/`,
        'locations': `/api/master-data/locations/${id}/`,
        'tariffs': `/api/master-data/tariffs/${id}/`,
        'customers': `/api/master-data/customers/${id}/`,
        'expenses': `/api/master-data/expense-items/${id}/`,
        'containers': `/api/master-data/container-types/${id}/`,
        'vehicles': `/api/master-data/vehicles/${id}/`,
        'trailers': `/api/master-data/trailers/${id}/`,
        'shipping_lines': `/api/master-data/shipping-lines/${id}/`,
        'subcontractors': `/api/master-data/subcontractors/${id}/`
    };

    try {
        const res = await fetchWithAuth(endpoints[currentMasterDataTab], {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã xóa bản ghi thành công!');
            loadMasterData();
            if (currentMasterDataTab === 'vehicles' || currentMasterDataTab === 'trailers') {
                if (typeof loadFleetData === 'function') loadFleetData();
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa bản ghi!');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}
