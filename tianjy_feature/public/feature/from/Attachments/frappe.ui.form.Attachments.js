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

prototype.render_attachments = function render_attachments(attachments) {
	let me = this;
	let attachments_to_render = attachments;

	let is_slicable = attachments.length > this.attachments_page_length;
	if (!this.show_all_attachments && is_slicable) {
		// render last n attachments as they are at the top
		let start = attachments.length - this.attachments_page_length;
		attachments_to_render = attachments.slice(start, attachments.length);
	}

	if (attachments_to_render.length) {
		let exists = {};
		let unique_attachments = attachments_to_render.filter(attachment => {
			// 是否存在的判断逻辑改为基于文件路径
			const file_name = attachment.file_url || attachment.file_name;
			return Object.prototype.hasOwnProperty.call(exists, file_name)
				? false
				: (exists[file_name] = true);
		});
		for (const attachment of unique_attachments) {
			me.add_attachment(attachment);
		}
	}

	if (!attachments.length) {
		// If no attachments in totality
		this.attachments_label.removeClass('has-attachments');
		// hide explore icon button
		this.parent.find('.explore-btn').toggle(false);
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
		<a href="${file_url}" target="_blank" ${!imageExt.has(ext) && `download="${file_name}"`} title="${frappe.utils.escape_html(file_name)}"
			class="ellipsis" style="max-width: calc(100% - 43px);"
		>
			<span>${file_name}</span>
		</a>`;

	let remove_action = null;
	let rename_action = null;
	const hasDeletePermission = frappe.model.can_delete(this.frm.doctype, this.frm.name);
	const hasWritePermission = frappe.model.can_write(this.frm.doctype, this.frm.name);
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
					const res = await frappe.call({
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
			${frappe.utils.icon(attachment.is_private ? 'es-line-lock' : 'es-line-unlock', 'sm ml-0')}
		</a>`;

	$(`<li class="attachment-row">`)
		.append(frappe.get_data_pill(file_label, fileid, remove_action, icon, rename_action, download_action))
		.insertAfter(this.add_attachment_wrapper);
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
