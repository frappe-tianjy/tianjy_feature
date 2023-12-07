

const linkFieldType = ['Link', 'Guigu Tree', 'Tianjy Related Link'];
/**
 * @typedef {object} IdentColumn
 * @property {number} column
 * @property {string[]} fields
 */

/**
 *
 * @param {string} doctype
 * @param {{ columns: {header_title: string}[] }} preview_data
 * @param {(v?: IdentColumn) => void} cb
 */
function showIdentColumnDialog(doctype, preview_data, cb) {
	let dialog = new frappe.ui.Dialog({
		title: __('Ident Configuration'),
		fields: [{
			fieldtype: 'Select',
			fieldname: 'column',
			label: __('Ident Column'),
			options: [{
				label: '<<<无>>>', value: '',
			}, preview_data.columns.map((col, i) => col.header_title === 'Sr. No' ? [] : [{
				label: col.header_title, value: i,
			}])].flat(2),
		}, {
			fieldtype: 'MultiSelect',
			fieldname: 'fields',
			label: __('Fields to be converted'),
			options: frappe.meta
				.get_docfields(doctype)
				.filter(df => linkFieldType.includes(df.fieldtype) && df.options?.split('\n')[0] === doctype)
				.map(df => {
					const label = __(df.label);
					const value = df.fieldname;
					return { label, value, description: value };
				}),

		}],
		primary_action: ({column, fields}) => {
			if (typeof fields === 'string') {
				// eslint-disable-next-line no-param-reassign
				fields = fields.split(/, */).filter(Boolean);
			} else if (Array.isArray(fields)) {
				// eslint-disable-next-line no-param-reassign
				fields = fields.filter(Boolean);
			} else {
				// eslint-disable-next-line no-param-reassign
				fields = [];
			}
			const no = column && parseInt(column);
			if (!no || !fields.length) {
				cb();
			} else {
				cb({ column: no - 1, fields });
			}
			dialog.hide();
		},
	});
	dialog.show();
}
/**
 *
 * @param {any} frm
 * @param {IdentColumn} [v]
 */
function setIdentColumn(frm, v) {
	const template_options = JSON.parse(frm.doc.template_options || '{}');
	template_options.identTransformation = v;
	frm.set_value('template_options', JSON.stringify(template_options));
	frm.save().then(() => frm.trigger('import_file'));

}
/**
 *
 * @param {string} doctype
 * @param {{ columns: {header_title: string}[] }} preview_data
 * @param {(v?: IdentColumn) => void} cb
 * @returns
 */
function createIdentColumnButton(doctype, preview_data, cb) {
	const button = document.createElement('button');
	button.className='btn btn-sm btn-default';
	button.appendChild(document.createTextNode(__('Update Ident Configuration')));
	button.addEventListener('click', () => {
		showIdentColumnDialog(doctype, preview_data, cb);
	});
	return button;

}
/**
 *
 * @param {*} ImportPreview
 */
function set_add_actions(ImportPreview) {
	const {prototype} = ImportPreview;
	const old_add_actions = prototype.add_actions;
	prototype.add_actions = function add_actions(...args) {
		old_add_actions.call(this, args);
		if (this.frm.doc.status === 'Success') { return; }
		/** @type {HTMLElement[]} */
		const [actionRow] = this.wrapper.find('.table-actions');
		if (!actionRow) { return; }
		const button = createIdentColumnButton(
			this.doctype,
			this.preview_data,
			v=> setIdentColumn(this.frm, v),
		);
		actionRow.insertBefore(button, actionRow.firstChild);

	};
}

// 此类定义的文件为按需加载
if (frappe?.data_import?.ImportPreview) {
	set_add_actions(frappe.data_import.ImportPreview);
} else {
	frappe.provide('frappe.data_import');
	let ImportPreview;
	Object.defineProperty(frappe.data_import, 'ImportPreview', {
		configurable: true,
		get() {
			return ImportPreview;
		},
		set(v) {
			ImportPreview = v;
			set_add_actions(v);
		},
	});
}
