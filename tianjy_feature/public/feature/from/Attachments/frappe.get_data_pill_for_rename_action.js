frappe.get_data_pill = (label, target_id = null, remove_action = null, image = null, rename_action = null, download_action = null) => {
	let data_pill_wrapper = $(`
		<button class="data-pill btn">
			<div class="flex align-center ellipsis">
				${image ? image : ''}
				<span class="pill-label ${image ? 'ml-2' : ''}">${label}</span>
			</div>
		</button>
	`);
	let btn_container = $('<div style="display:flex;"></div>');
	if (remove_action) {
		let remove_btn = $(`
			<span class="remove-btn cursor-pointer">
				${frappe.utils.icon('close', 'sm')}
			</span>
		`).click(() => {
			remove_action(target_id || label, data_pill_wrapper);
		});
		btn_container.append(remove_btn);
	}
	if (rename_action) {
		let rename_btn = $(`
			<span class="remove-btn cursor-pointer">
				${frappe.utils.icon('edit', 'sm')}
			</span>
		`).click(() => {
			rename_action(target_id || label, data_pill_wrapper);
		});
		btn_container.append(rename_btn);
	}
	if (download_action) {
		let download_btn = $(`
			<span class="remove-btn cursor-pointer">
				${frappe.utils.icon('down-arrow', 'sm')}
			</span>
		`).click(() => {
			download_action(target_id || label, data_pill_wrapper);
		});
		btn_container.append(download_btn);
	}
	if (rename_action || remove_action || download_action) {
		data_pill_wrapper.append(btn_container);
	}
	return data_pill_wrapper;
};
