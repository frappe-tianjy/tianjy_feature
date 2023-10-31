frappe.ui.form.ControlComment.prototype.make_attachments = function () {
	let me = this;
	if (!me.frm){ return; }
	me.attachments = new frappe.ui.form.CommentAttachments({
		parent: me.comment_wrapper.find('.form-attachments'),
		frm: me.frm,
	});
};
frappe.ui.form.ControlComment.prototype.clear_attachments = function () {
	this.attachments.clear();
};
frappe.ui.form.ControlComment.prototype.refresh_attachments = function (attachments) {
	this.attachments.refresh(attachments);
};
frappe.ui.form.ControlComment.prototype.make_wrapper = function () {
	this.comment_wrapper = this.no_wrapper
		? $('<div class="frappe-control"></div>')
		: $(`
			<div class="comment-input-wrapper">
				<div class="comment-input-header">
					<span>${__('Add a comment')}</span>
				</div>
				<div class="comment-input-container">
					<div class="frappe-control"></div>
					<div class="text-muted small">
						${__('Ctrl+Enter to add comment')}
					</div>
				</div>
				<ul class="list-unstyled sidebar-menu form-attachments">
					<li class="sidebar-label attachments-label">
					</li>
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
				</ul>
				<button class="btn btn-default btn-comment btn-xs">
					${__('Comment')}
				</button>
			</div>
		`);

	this.comment_wrapper.appendTo(this.parent);

	// wrapper should point to frappe-control
	this.$wrapper = this.no_wrapper
		? this.comment_wrapper
		: this.comment_wrapper.find('.frappe-control');

	this.wrapper = this.$wrapper;

	this.button = this.comment_wrapper.find('.btn-comment');
	this.make_attachments();
};
