// @ts-check
frappe.ui.form.ControlComment.prototype.make_attachments = function () {
	let me = this;
	if (!me.frm){ return; }
	me.attachments = new frappe.ui.form.CommentAttachments({
		parent: me.comment_wrapper.find('.attachment-container'),
		frm: me.frm,
	});
};
frappe.ui.form.ControlComment.prototype.clear_attachments = function () {
	this.attachments.clear();
};
frappe.ui.form.ControlComment.prototype.refresh_attachments = function (attachments) {
	this.attachments.refresh(attachments);
};
const old_make_wrapper = frappe.ui.form.ControlComment.prototype.make_wrapper;

frappe.ui.form.ControlComment.prototype.make_wrapper = function make_wrapper() {
	old_make_wrapper.apply(this, arguments);
	if (this.no_wrapper) { return; }
	this.comment_wrapper.children('button').before(`
	<div class="attachment-container">
	<ul class="list-unstyled sidebar-menu form-attachments">
		<li class="sidebar-label attachments-label">
		</li>
	</ul>
		<li class="add-attachment-btn">
			<button class="data-pill btn">
				<span class="pill-label ellipsis">
					${__('Attach File')}
				</span>
				<svg class="icon icon-sm">
					<use href="#icon-add"></use>
				</svg>
			</button>
		</li>
	</div>
`);
	this.make_attachments();
};
