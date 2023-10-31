/**
 * 与 frappe.ui.form.ControlLink.prototype.new_doc 一同实现
 * 增加 FormDetail 中跳转页面新增内容后也能返回 FormDetail 的功能
 */

frappe.ui.form.update_calling_link = newdoc => {
	if (!frappe._from_link) { return; }
	let doc = frappe.get_doc(frappe._from_link.doctype, frappe._from_link.docname);

	let is_valid_doctype = () => {
		if (frappe._from_link.df.fieldtype === 'Link' || frappe._from_link.df.fieldtype === 'Tree Select') {
			return newdoc.doctype === frappe._from_link.df.options;
		}
		// dynamic link, type is dynamic
		return newdoc.doctype === doc[frappe._from_link.df.options];

	};

	if (is_valid_doctype()) {
		frappe.model.with_doctype(newdoc.doctype, () => {
			let meta = frappe.get_meta(newdoc.doctype);
			// set value
			if (doc && doc.parentfield) {
				//update values for child table
				$.each(
					frappe._from_link.frm.fields_dict[doc.parentfield].grid.grid_rows,
					function (index, field) {
						if (field.doc && field.doc.name === frappe._from_link.docname) {
							if (meta.title_field && meta.show_title_field_in_link) {
								frappe.utils.add_link_title(
									newdoc.doctype,
									newdoc.name,
									newdoc[meta.title_field],
								);
							}
							frappe._from_link.set_value(newdoc.name);
						}
					},
				);
			} else {
				if (meta.title_field && meta.show_title_field_in_link) {
					frappe.utils.add_link_title(
						newdoc.doctype,
						newdoc.name,
						newdoc[meta.title_field],
					);
				}
				frappe._from_link.set_value(newdoc.name);
			}

			// refresh field
			frappe._from_link.refresh();
			if (frappe.tianjy._backView) {
				frappe.tianjy._backView();
			} else if (frappe._from_link.frm) {
				// if from form, switch
				frappe
					.set_route(
						'Form',
						frappe._from_link.frm.doctype,
						frappe._from_link.frm.docname,
					)
					.then(() => {
						frappe.utils.scroll_to(frappe._from_link_scrollY);
					});
			}

			frappe._from_link = null;
		});
	}
};
