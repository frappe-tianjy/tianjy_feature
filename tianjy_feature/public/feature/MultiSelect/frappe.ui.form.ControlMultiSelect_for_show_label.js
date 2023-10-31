frappe.ui.form.ControlMultiSelect.prototype.format_for_input = function (value) {
	if (value == null) {
		return '';
	} else if (this._data && this._data.length) {
		const valueArr = value.split(',');
		const labelArr = valueArr.map(item => item.trim()).filter(Boolean).map(v => {
			const item = this._data.find(i => i.value == v);
			return item ? item.label : v;
		});
		labelArr.push(undefined);
		return labelArr.join(',');
	}
	return value;

};

frappe.ui.form.ControlMultiSelect.prototype.get_input_value = function () {
	if (this.$input) {
		const labels = this.$input.val();
		const labelArr = labels.split(',');
		const valueArr = labelArr.map(item => item.trim()).filter(Boolean).map(label => {
			const obj = this._data?.find(i => i.label == label);
			return obj ? obj.value : label;
		});
		return valueArr.join(',');
	}
};

frappe.ui.form.ControlMultiSelect.prototype.parse_options = function (options) {
	if (typeof options === 'string' && options[0] === '[') {
		options = frappe.utils.parse_json(options);
	}
	if (typeof options === 'string') {
		options = options.split('\n');
	}
	if (typeof options[0] === 'string') {
		options = options.map(o => ({ label: __(o), value: o }));
	}
	return options;
};

frappe.ui.form.ControlMultiSelect.prototype.get_value = function () {
	let data = frappe.ui.form.Control.prototype.get_value.call(this);
	// find value of label from option list and return actual value string
	let { options } = this.df;
	if (typeof options === 'string' && options[0] === '[') {
		options = frappe.utils.parse_json(options);
	}
	if (typeof options === 'string') {
		options = options.split('\n');
	}
	if (typeof options[0] === 'string') {
		options = options.map(o => ({ label: __(o), value: o }));
	}
	if (options && options.length && options[0].label) {
		data = data.split(',').map(op => op.trim());
		data = data
			.map(val => {
				let option = options.find(op => op.value === val);
				return option ? option.value : null;
			})
			.filter(n => n != null)
			.join(', ');
	}
	return data;
};
