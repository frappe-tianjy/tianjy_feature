import Awesomplete from 'awesomplete';

frappe.ui.form.ControlMultiLink = class ControlMultiLink extends frappe.ui.form.ControlLink {
	make_input() {
		super.make_input();
	}
	setup_awesomeplete() {
		let me = this;

		this.$input.cache = {};

		this.awesomplete = new Awesomplete(me.input, {
			minChars: 0,
			maxItems: 99,
			autoFirst: true,
			list: [],
			replace(item) {
				// Override Awesomeplete replace function as it is used to set the input value
				// https://github.com/LeaVerou/awesomplete/issues/17104#issuecomment-359185403
				let before = this.input.value.match(/^.+,\s*|/)[0];
				this.input.value = `${before + item.label}, `;
			},
			data(item) {
				return {
					label: me.get_translated(item.label || item.value),
					value: item.value,
				};
			},
			filter(text, input) {
				return true;
			},
			item(item) {
				let d = this.get_item(item.value);
				if (!d.label) {
					d.label = d.value;
				}

				let _label = me.get_translated(d.label);
				let html = d.html || `<strong>${_label}</strong>`;
				if (
					d.description &&
					// for title links, we want to inlude the value in the description
					// because it will not visible otherwise
					(me.is_title_link() || d.value !== d.description)
				) {
					html += `<br><span class="small">${__(d.description)}</span>`;
				}
				return $('<li></li>')
					.data('item.autocomplete', d)
					.prop('aria-selected', 'false')
					.html(`<a><p title="${_label}">${html}</p></a>`)
					.get(0);
			},
			sort() {
				return 0;
			},
		});

		this.custom_awesomplete_filter && this.custom_awesomplete_filter(this.awesomplete);

		this.$input.on(
			'input',
			frappe.utils.debounce(function (e) {
				const doctype = me.get_options();
				const term = e.target.value;
				const text = term.match(/[^,]*$/)[0];
				const args = {
					txt: text,
					doctype,
					ignore_user_permissions: me.df.ignore_user_permissions,
					reference_doctype: me.get_reference_doctype() || '',
				};
				frappe.call({
					type: 'POST',
					method: 'frappe.desk.search.search_link',
					no_spinner: true,
					args,
					callback(r) {
						r.results = me.merge_duplicates(r.results);

						if (!me.df.only_select) {
							if (frappe.model.can_create(doctype)) {
								// new item
								r.results.push({
									html:
										`<span class='text-primary link-option'>` +
										`<i class='fa fa-plus' style='margin-right: 5px;'></i> ${__('Create a new {0}', [__(me.get_options())])
										}</span>`,
									label: __('Create a new {0}', [__(me.get_options())]),
									value: 'create_new__link_option',
									action: me.new_doc,
								});
							}

							//custom link actions
							let custom__link_options =
								frappe.ui.form.ControlLink.link_options &&
								frappe.ui.form.ControlLink.link_options(me);

							if (custom__link_options) {
								r.results = r.results.concat(custom__link_options);
							}

							// advanced search
							if (locals && locals.DocType) {
								// not applicable in web forms
								r.results.push({
									html:
										`<span class='text-primary link-option'>` +
										`<i class='fa fa-search' style='margin-right: 5px;'></i> ${__('Advanced Search')
										}</span>`,
									label: __('Advanced Search'),
									value: 'advanced_search__link_option',
									action: me.open_advanced_search,
								});
							}
						}
						if (me.awesomplete) {
							me.awesomplete.list = r.results;
						}
					},
				});
			}, 500),
		);

		this.$input.on('blur', function () {
			if (me.selected) {
				me.selected = false;
				return;
			}
			let value = me.get_input_value();
			let label = me.get_label_value();
			let last_value = me.last_value || '';
			let last_label = me.label || '';

			if (value !== last_value) {
				me.parse_validate_and_set_in_model(value, null, label);
			}
		});

		this.$input.on('awesomplete-open', () => {
			this.autocomplete_open = true;

			if (!me.get_label_value()) {
				// hide link arrow to doctype if none is set
				me.$link.toggle(false);
			}
		});

		this.$input.on('awesomplete-close', e => {
			this.autocomplete_open = false;

			if (!me.get_label_value()) {
				// hide link arrow to doctype if none is set
				me.$link.toggle(false);
			}
		});

		this.$input.on('awesomplete-select', function (e) {
			let o = e.originalEvent;
			let item = me.awesomplete.get_item(o.text.value);

			me.autocomplete_open = false;

			// prevent selection on tab
			let TABKEY = 9;
			if (e.keyCode === TABKEY) {
				e.preventDefault();
				me.awesomplete.close();
				return false;
			}

			if (item.action) {
				item.value = '';
				item.label = '';
				item.action.apply(me);
			}

			// if remember_last_selected is checked in the doctype against the field,
			// then add this value
			// to defaults so you do not need to set it again
			// unless it is changed.
			if (me.df.remember_last_selected_value) {
				frappe.boot.user.last_selected_values[me.df.options] = item.value;
			}
			const newValue = me.get_values();
			newValue.push(item.value);
			me.parse_validate_and_set_in_model(newValue.join(' ,'), null, item.label);
		});

		this.$input.on('awesomplete-selectcomplete', function (e) {
			let o = e.originalEvent;
			if (o.text.value.indexOf('__link_option') !== -1) {
				me.$input.val('');
			}
		});
	}
	get_input_value() {
		if (this.$input) {
			const input_value = this.$input.val();
			const value = input_value.split(',').map(i => i.trim()).filter(Boolean)
				.map(label => this.title_value_map?.[label]||label)
				.filter(Boolean)
				.join(',');
			return value;
		}
		return null;
	}
	parse_validate_and_set_in_model(value, e, label) {
		if (this.parse) {
			value = this.parse(value, label);
		}
		if (label) {
			const valueArr = label.split(',').map(i => i.trim()).filter(Boolean);
			// label.split(',').map(i => i.trim()).filter(Boolean)
			// 	.map((l, index) => {
			// 		frappe.utils.add_link_title(this.df.options, valueArr[index], l);
			// 	});
			this.label = this.get_translated(label);
		}

		return this.validate_and_set_in_model(value, e, true);
	}
	set_formatted_input(value) {
		if (!value) { return; }
		this.$input && this.$input.val(this.format_for_input(value));
		if (!this.title_value_map) {
			this.title_value_map = {};
		}
		this.set_link_title(value);
	}
	async set_link_title(value) {
		const doctype = this.get_options();

		if (!doctype || !this.is_title_link()) {
			this.translate_and_set_input_value(value, value);
			return;
		}
		const titlePromiseArr = value.split(',').map(op => op.trim()).filter(Boolean)
			.map(op => op.trim())
			.map(async v => {
				const link_title = frappe.utils.get_link_title(doctype, v) ||
					(await frappe.utils.fetch_link_title(doctype, v));

				return { link_title, value: v };
			});
		Promise.allSettled(titlePromiseArr).then(res => {
			const titleArr = res.map(i => {
				let translated_link_text = this.get_translated(i.value.link_title);
				this.title_value_map[translated_link_text] = i.value.value;
				return translated_link_text;
			});
			this.translate_and_set_input_value(`${titleArr.join(', ')}, `, value);
		});
	}
	translate_and_set_input_value(link_title, value) {
		this.set_input_value(link_title);
	}

	get_values() {
		const value = this.get_value() || '';
		const values = value.split(/\s*,\s*/).filter(d => d);

		return values;
	}
};
if (Awesomplete) {
	Awesomplete.prototype.get_item = function (value) {
		return this._list.find(function (item) {
			return item.value === value;
		});
	};
}
