/**
 *
 * @param {Blob | MediaSource | string} data
 * @param {string} name
 */
function saveAs(data, name) {
	const url = typeof data === 'string' ? data : URL.createObjectURL(data);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.target = '_blank';
	a.click();
	if (typeof data !== 'string') {
		setTimeout(() => { URL.revokeObjectURL(url); }, 30000);
	}
}

const imageExt = new Set([
	'bmp', 'jpg', 'jpeg', 'png', 'gif',
	'tiff', 'svg', 'webp',
	'xbm', 'pjp', 'svgz', 'ico', 'jfif', 'pjpeg', 'avif',
]);

// 文档附件的的显示处理
const { prototype } = frappe.ui.form.Attachments;
prototype.refresh = function refresh() {
	let me = this;

	if (this.frm.doc.__islocal) {
		this.parent.toggle(false);
		return;
	}
	this.parent.toggle(true);
	this.parent.find('.attachment-row').remove();

	let max_reached = this.max_reached();
	const hasCreatePermission = frappe.perm.has_perm(this.frm.doctype, 0, 'create');
	const hasWritePermission = frappe.perm.has_perm(this.frm.doctype, 0, 'write');
	this.add_attachment_wrapper.toggle(!max_reached&&hasCreatePermission&&hasWritePermission);

	// add attachment objects
	let attachments = this.get_attachments();
	if (attachments.length) {
		let exists = {};
		let unique_attachments = attachments.filter(attachment => {
			const file_name = attachment.file_url || attachment.file_name;
			return Object.prototype.hasOwnProperty.call(exists, file_name)
				? false
				: (exists[file_name] = true);
		});
		for (const attachment of unique_attachments) {
			me.add_attachment(attachment);
		}
	} else {
		this.attachments_label.removeClass('has-attachments');
	}
};

prototype.add_attachment = function add_attachment(attachment) {
	let { file_name } = attachment;
	let file_url = this.get_file_url(attachment);
	let fileid = attachment.name;
	if (!file_name) {
		file_name = file_url;
	}

	let me = this;
	const arr = file_name.split('.');
	const ext = arr[arr.length - 1].toLowerCase();

	let file_label = `
		<a href="${file_url}" target="_blank" ${!imageExt.has(ext) && `download="${file_name}"`} title="${file_name}" class="ellipsis" style="max-width: calc(100% - 43px);">
			<span>${file_name}</span>
		</a>`;

	let remove_action = null;
	let rename_action = null;
	const hasDeletePermission = frappe.perm.has_perm(this.frm.doctype, 0, 'delete');
	const hasWritePermission = frappe.perm.has_perm(this.frm.doctype, 0, 'write');
	if (hasDeletePermission&&hasWritePermission) {
		remove_action = function (target_id) {
			frappe.confirm(__('Are you sure you want to delete the attachment?'), function () {
				let target_attachment = me
					.get_attachments()
					.find(attachment => attachment.name === target_id);
				let to_be_removed = me
					.get_attachments()
					.filter(
						attachment => (attachment.file_url || attachment.file_name) === (target_attachment.file_url || target_attachment.file_name),
					);
				for (const attachment of to_be_removed) { me.remove_attachment(attachment.name); }
			});
			return false;
		};
	}
	if (hasWritePermission){
		rename_action = function (target_id) {
			const { name, file_name } = attachment;
			const ss = file_name.split('.');
			const s = ss.length > 1 && ss.pop() || '';
			const ext = s ? `.${s}` : '';
			const dialog = new frappe.ui.Dialog({
				title: __('修改文件名'),
				fields: [{
					label: '新名称',
					fieldname: 'filename',
					fieldtype: 'Data',
					default: ext ? file_name.slice(0, -ext.length) : file_name,
				}],
				async primary_action(data) {
					const { filename } = data;
					const replaced = filename.replace(/[\\/]/g, '');
					if (/^[ \s]*$/.test(replaced)) {
						return;
					}
					const res = await frappe.call<{message:boolean}>({
						method: 'tianjy_feature.feature.doctype.file.rename',
						args: { name, filename: replaced + ext },
						freeze: true,
					});
					if (res?.message===true){
						dialog.hide();
						me.frm.sidebar.reload_docinfo();
						// me.refresh();
						frappe.show_alert({ message: __('修改成功'), indicator: 'green' });
					}
				},
				primary_action_label: __('修改文件名'),
			});
			dialog.show();
		};
	}
	const download_action = function () {
		saveAs(file_url, file_name);
	};
	const icon = `<a href="/app/file/${fileid}">
			${frappe.utils.icon(attachment.is_private ? 'lock' : 'unlock', 'sm ml-0')}
		</a>`;

	$(`<li class="attachment-row">`)
		.append(frappe.get_data_pill(file_label, fileid, remove_action, icon, rename_action, download_action))
		.insertAfter(this.attachments_label.addClass('has-attachments'));
};
// 删除成功添加提示
prototype.remove_attachment = function (fileid, callback) {
	if (!fileid) {
		if (callback) { callback(); }
		return;
	}

	let me = this;
	return frappe.call({
		method: 'frappe.desk.form.utils.remove_attach',
		type: 'DELETE',
		args: {
			fid: fileid,
			dt: me.frm.doctype,
			dn: me.frm.docname,
		},
		callback (r, rt) {
			if (r.exc) {
				if (!r._server_messages) { frappe.msgprint(__('There were errors')); }
				return;
			}
			frappe.show_alert({ message: __('删除成功'), indicator: 'green' });
			me.remove_fileid(fileid);
			me.frm.sidebar.reload_docinfo();
			if (callback) { callback(); }
		},
	});
};
