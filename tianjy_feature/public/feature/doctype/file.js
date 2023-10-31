
/** @param {frappe.ui.form.Form} frm  */
function showRename(frm) {
	/** @type {{ name: string; file_name: string }} */
	const { name, file_name } = frm.doc;
	const ss = file_name.split('.');
	const s = ss.length > 1 && ss.pop() || '';
	const ext = s ? `.${s}` : '';
	const dialog = new frappe.ui.Dialog({
		title: __('修改文件名'),
		fields: [{
			label: '新名称',
			fieldname: 'filename',
			fieldtype: 'Data',
			default: ext ? file_name.slice(0, - ext.length) : file_name,
		}],
		async primary_action(data) {
			const { filename } = data;
			const replaced = filename.replace(/[\\/]/g, '');
			if (/^[ 　\s]*$/.test(replaced)) {
				return;
			}
			await frappe.call({
				method: 'tianjy_feature.feature.doctype.file.rename',
				args: { name, filename: replaced + ext },
				freeze: true,
			});
			dialog.hide();
			frm.reload_doc();
		},
		primary_action_label: __('修改文件名'),
	});
	dialog.show();
}

async function hasPermission(file) {
	return frappe.call({
		method: 'tianjy_feature.feature.doctype.file.has_permission',
		args: { file: file.name },
	}).then(v => v.message);
}

frappe.ui.form.on('File', {
	async refresh(frm) {
		if (frm.is_new()) { return; }
		const promise = hasPermission(frm.doc);
		// @ts-ignore
		frm.testPermissionPromise = promise;
		// @ts-ignore
		if (!await promise || promise !== frm.testPermissionPromise || frm.is_new()) {
			return;
		}
		frm.add_custom_button('修改文件名', () => showRename(frm));
	},
});
