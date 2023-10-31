/**
 * 与 frappe.ui.form.update_calling_link 一同实现
 * 增加 FormDetail 中跳转页面新增内容后也能返回 FormDetail 的功能
 */

frappe.ui.form.ControlLink.prototype.new_doc = function new_doc() {
	let doctype = this.get_options();
	let me = this;

	if (!doctype) { return; }

	let { df } = this;
	if (this.frm && this.frm.doctype !== this.df.parent) {
		// incase of grid use common df set in grid
		df = this.frm.get_docfield(this.doc.parentfield, this.df.fieldname);
	}
	// set values to fill in the new document
	if (df && df.get_route_options_for_new_doc) {
		frappe.route_options = df.get_route_options_for_new_doc(this);
	} else {
		frappe.route_options = {};
	}

	// partially entered name field
	frappe.route_options.name_field = this.get_label_value();

	// reference to calling link
	frappe._from_link = this;
	frappe._from_link_scrollY = $(document).scrollTop();

	const routes = [...frappe.get_route()];
	if (routes.length > 2 && routes[0] === 'List') {
		frappe.tianjy._backView = () => {
			const route = [frappe.router.slug(routes[1]), 'view', ...routes.slice(2)];
			frappe.set_route(route);
			frappe.tianjy._backView = null;
		};
	} else {
		frappe.tianjy._backView = null;
	}

	frappe.ui.form.make_quick_entry(doctype, doc => me.set_value(doc.name));

	return false;
};
