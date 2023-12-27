import frappe
def extend_bootinfo(bootinfo):
	if frappe.local.conf.get('enable_relative_time', False):
		bootinfo["enable_relative_time"] = True
