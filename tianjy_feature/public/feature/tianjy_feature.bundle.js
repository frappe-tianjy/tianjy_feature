import './MultiLink';
import './back_by_new';
import './comment';

// 批量导入中增加外部标识的支持
import './data_import/frappe.data_import.ImportPreview';

// 日期区间增加“今天”、“本周”、“本月”、“今年”等
import './DateRange/frappe.ui.form.ControlDateRange.prototype.set_datepicker';

// 文档附件的的显示处理
import './from/Attachments/frappe.ui.form.Attachments';

// 过滤器select 包含和不包含显示label
import './MultiSelect/frappe.ui.form.ControlMultiSelect_for_show_label.js';


import './doctype/file.js';
import './datetime/comment_when.js';
