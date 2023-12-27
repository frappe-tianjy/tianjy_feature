

function comment_when(datetime, mini) {
	const enable_relative_time = frappe.boot.enable_relative_time
	const timestamp = frappe.datetime.str_to_user ? frappe.datetime.str_to_user(datetime) : datetime;
	return (
		`<span class="frappe-timestamp ${
			mini ? ' mini' : ''
		}" data-timestamp="${
			datetime
		}" title="${
			timestamp
		}">${
			enable_relative_time || mini ? frappe.datetime.prettyDate(datetime, mini) : timestamp
		}</span>`
	);
}

frappe.datetime.refresh_when = function () {
	if (!jQuery) { return }
	const selector = frappe.boot.enable_relative_time ? '.frappe-timestamp' : '.frappe-timestamp.mini';
	$(selector).each(function () {
		$(this).html(frappe.datetime.prettyDate($(this).attr('data-timestamp'), $(this).hasClass('mini')));
	});
};

if (window.comment_when) {
	window.comment_when = comment_when;
}
frappe.datetime.comment_when = comment_when;
