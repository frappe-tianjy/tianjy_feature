// 日期区间增加“今天”、“本周”、“本月”、“今年”等

/**
 *
 * @param {Date} date
 * @returns
 */
function getDateStr(date) {
	// @ts-ignore
	return [
		date.getFullYear(),
		`${date.getMonth() + 1}`.padStart(2, '0'),
		`${date.getDate()}`.padStart(2, '0'),
	].join(('-'));
}

function getWeekStartDate() {
	const date = new Date();
	const day = date.getDay();
	// @ts-ignore
	const weekStart = frappe.datetime.get_first_day_of_the_week_index();
	const k = day < weekStart ? day - weekStart + 7 : day - weekStart;
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() - k);
}
const dateOptions = [[{
	label: '今天', get: () => {
		const date = new Date();
		return [date, date];
	},
}, {
	label: '昨天', get: () => {
		const date = new Date();
		date.setDate(date.getDate() - 1);
		return [date, date];
	},
}, {
	label: '明日', get: () => {
		const date = new Date();
		date.setDate(date.getDate() + 1);
		return [date, date];
	},
}, {
	label: '本周', get: () => {
		const date = getWeekStartDate();
		return [date, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6)];
	},
}, {
	label: '上周', get: () => {
		const date = getWeekStartDate();
		date.setDate(date.getDate() - 7);
		return [date, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6)];
	},
}, {
	label: '下周', get: () => {
		const date = getWeekStartDate();
		date.setDate(date.getDate() + 7);
		return [date, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6)];
	},
}], [{
	label: '本月', get: () => {
		const date = new Date();
		date.setDate(1);
		return [date, new Date(date.getFullYear(), date.getMonth() + 1, 0)];
	},
}, {
	label: '上月', get: () => {
		const date = new Date();
		date.setMonth(date.getMonth() - 1, 1);
		return [date, new Date(date.getFullYear(), date.getMonth() + 1, 0)];
	},
}, {
	label: '下月', get: () => {
		const date = new Date();
		date.setMonth(date.getMonth() + 1, 1);
		return [date, new Date(date.getFullYear(), date.getMonth() + 1, 0)];
	},
}, {
	label: '今年', get: () => {
		const date = new Date();
		date.setMonth(0, 1);
		return [date, new Date(date.getFullYear() + 1, 0, 0)];
	},
}, {
	label: '去年', get: () => {
		const date = new Date();
		date.setFullYear(date.getFullYear() - 1, 0, 1);
		return [date, new Date(date.getFullYear() + 1, 0, 0)];
	},
}, {
	label: '明年', get: () => {
		const date = new Date();
		date.setFullYear(date.getFullYear() + 1, 0, 1);
		return [date, new Date(date.getFullYear() + 1, 0, 0)];
	},
}]];

/**
 *
 * @param {(dates: [string, string]) => void} cb
 * @returns {HTMLElement}
 */
function createGroups(cb) {
	const root = document.createElement('div');
	for (const list of dateOptions) {
		const group = root.appendChild(document.createElement('div'));
		group.style.display = 'flex';
		group.style.flexDirection = 'row';
		for (const {label, get} of list) {
			const opt = group.appendChild(document.createElement('div'));
			opt.className = 'datepicker--nav-title';
			opt.style.whiteSpace = 'nowrap';
			opt.style.flex = '1';
			opt.style.textAlign = 'center';
			opt.style.paddingBlock = '8px';
			opt.style.paddingInline = '0';
			opt.appendChild(document.createTextNode(label));
			opt.addEventListener('click', () => {
				const [start, end] = get();
				cb([getDateStr(start), getDateStr(end)]);
			});
		}
	}
	return root;

}
/**
 *
 * @param {Element} element
 * @returns
 */
function getScrollParent(element){
	let parent = element.parentElement;
	if (!parent){
		return element;
	}
	const scrollValue = ['scroll', 'auto'];
	const overFlowValue = window.getComputedStyle(parent).getPropertyValue('overflow');
	const overFlowXValue = window.getComputedStyle(parent).getPropertyValue('overflow-x');
	const overFlowYValue = window.getComputedStyle(parent).getPropertyValue('overflow-y');
	if (scrollValue.indexOf(overFlowValue)!==-1||
		scrollValue.indexOf(overFlowXValue)!==-1||
		scrollValue.indexOf(overFlowYValue)!==-1){
		return parent;
	}
	return getScrollParent(parent);
}
// @ts-ignore
const {prototype} = frappe.ui.form.ControlDateRange;
const old_set_datepicker = prototype.set_datepicker;
prototype.set_datepicker = function set_datepicker() {
	old_set_datepicker.call(this);

	const {datepicker} = this;
	/** @type {HTMLElement} */
	const el = datepicker?.$datepicker?.[0];
	if (!el) { return; }
	el.appendChild(createGroups(dates => {
		this.set_input(dates);
		this.$input.trigger('change');
		datepicker.hide();
	}));
	// 日期组建添加祖先父元素滚动监听，设置panel位置
	if (!datepicker?.$el?.[0]){ return; }
	const target = getScrollParent(datepicker?.$el?.[0]);
	target.addEventListener('scroll', ()=>{
		const {top, left} = datepicker?.$el?.[0]?.getBoundingClientRect();
		const offset = top + 40;
		el.style.top = `${offset}px`;
		el.style.left = `${left}px`;
	});
};
