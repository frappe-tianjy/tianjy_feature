/**
 * 过滤器中 link 类型 操作符为 in、not in 时使用多选 MultiLink
 */
frappe.ui.Filter.prototype.set_events = function(){
	this.filter_edit_area.find('.remove-filter').on('click', () => {
		this.remove();
		this.on_change();
	});

	this.filter_edit_area.find('.condition').change(() => {
		if (!this.field) { return; }

		let condition = this.get_condition();
		let fieldtype = null;

		if (['in', 'like', 'not in', 'not like'].includes(condition)) {
			fieldtype = 'Data';
			this.add_condition_help(condition);
		} else {
			this.filter_edit_area.find('.filter-description').empty();
		}

		if (
			['Select', 'MultiSelect'].includes(this.field.df.fieldtype) &&
			['in', 'not in'].includes(condition)
		) {
			fieldtype = 'MultiSelect';
		}
		if (
			['Link'].includes(this.field.df.original_type || this.field.df.fieldtype) &&
			['in', 'not in'].includes(condition)
		) {
			fieldtype = 'MultiLink';
		}
		this.set_field(this.field.df.parent, this.field.df.fieldname, fieldtype, condition);
	});
};
