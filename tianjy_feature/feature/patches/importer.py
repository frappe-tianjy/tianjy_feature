import json
import timeit

import frappe
from frappe import _
from frappe.utils import cstr, update_progress_bar

link_field_types = ['Link', 'Guigu Tree', 'Tianjy Related Link']
def get_doctype_by_options(options):
	if not options or not isinstance(options,str): return ''
	return options.split('\n')[0]


from frappe.core.doctype.data_import.importer import (
	Importer, Row, Column, INSERT, create_import_log, get_select_options
)


def get_ident(rows, index):
	if not len(rows): return
	row = rows[0]
	for r in rows:
		if r.row_number < row.row_number:
			row = r
	data = row.data
	if index >= len(data): return
	return data[index]


def import_data(self):
		self.before_import()

		# parse docs from rows
		payloads = self.import_file.get_payloads_for_import()

		# dont import if there are non-ignorable warnings
		warnings = self.import_file.get_warnings()
		warnings = [w for w in warnings if w.get("type") != "info"]

		if warnings:
			if self.console:
				self.print_grouped_warnings(warnings)
			else:
				self.data_import.db_set("template_warnings", json.dumps(warnings))
			return

		# setup import log
		import_log = (
			frappe.get_all(
				"Data Import Log",
				# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
				fields=["row_indexes", "success", "log_index", "docname"],
				# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
				filters={"data_import": self.data_import.name},
				order_by="log_index",
			)
			or []
		)

		log_index = 0

		# Do not remove rows in case of retry after an error or pending data import
		if (
			self.data_import.status == "Partial Success"
			and len(import_log) >= self.data_import.payload_count
		):
			# remove previous failures from import log only in case of retry after partial success
			import_log = [log for log in import_log if log.get("success")]

		# get successfully imported rows
		imported_rows = []
		for log in import_log:
			log = frappe._dict(log)
			if log.success or len(import_log) < self.data_import.payload_count:
				imported_rows += json.loads(log.row_indexes)

			log_index = log.log_index

		# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
		template_options = self.template_options or frappe._dict(column_to_field_map=frappe._dict())
		identColumn = 0
		identTransformationFields: list[str] | None = None
		if self.import_type == INSERT:
			if identTransformation := template_options.get('identTransformation', None):
				identColumn = identTransformation['column']
				doctype = self.doctype
				identTransformationFields = [f.fieldname for f in frappe.get_meta(doctype).get('fields', {
					'fieldname': ('in', identTransformation['fields']),
					'fieldtype': ('in', link_field_types),
				}) if get_doctype_by_options(f.options) == doctype]

		ident_map = {}
		if identTransformationFields and import_log:
			all_rows = {}
			for payload in payloads:
				for row in payload.rows:
					all_rows[row.row_number] = row.data
			for log in import_log:
				docname = log.docname
				if not docname: continue
				row_indexes = json.loads(log.row_indexes)
				if not row_indexes: continue
				data = all_rows.get(min(row_indexes), None)
				if not data: continue
				if identColumn >= len(data): continue
				ident = data[identColumn]
				if not ident: continue
				ident_map[ident] = docname
		# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
		# start import
		total_payload_count = len(payloads)
		batch_size = frappe.conf.data_import_batch_size or 1000

		for batch_index, batched_payloads in enumerate(frappe.utils.create_batch(payloads, batch_size)):
			for i, payload in enumerate(batched_payloads):
				doc = payload.doc
				row_indexes = [row.row_number for row in payload.rows]
				current_index = (i + 1) + (batch_index * batch_size)

				if set(row_indexes).intersection(set(imported_rows)):
					print("Skipping imported rows", row_indexes)
					if total_payload_count > 5:
						frappe.publish_realtime(
							"data_import_progress",
							{
								"current": current_index,
								"total": total_payload_count,
								"skipping": True,
								"data_import": self.data_import.name,
							},
							user=frappe.session.user,
						)
					continue

				try:
					start = timeit.default_timer()
					# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
					if identTransformationFields:
						for field in identTransformationFields:
							if link_value := doc.get(field,None):
								if link_value := ident_map.get(link_value, None):
									doc[field] = link_value
					# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
					# 进行父节点替换
					doc = self.process_doc(doc)
					# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
					if doc and identTransformationFields:
						if (doc_ident := get_ident(payload.rows, identColumn)) and (doc_name := doc.get('name', None)):
							ident_map[doc_ident] = doc_name
					# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
					processing_time = timeit.default_timer() - start
					eta = self.get_eta(current_index, total_payload_count, processing_time)

					if self.console:
						update_progress_bar(
							f"Importing {total_payload_count} records",
							current_index,
							total_payload_count,
						)
					elif total_payload_count > 5:
						frappe.publish_realtime(
							"data_import_progress",
							{
								"current": current_index,
								"total": total_payload_count,
								"docname": doc.name,
								"data_import": self.data_import.name,
								"success": True,
								"row_indexes": row_indexes,
								"eta": eta,
							},
							user=frappe.session.user,
						)

					create_import_log(
						self.data_import.name,
						log_index,
						{"success": True, "docname": doc.name, "row_indexes": row_indexes},
					)

					log_index += 1

					if not self.data_import.status == "Partial Success":
						self.data_import.db_set("status", "Partial Success")

					# commit after every successful import
					frappe.db.commit()

				except Exception:
					messages = frappe.local.message_log
					frappe.clear_messages()

					# rollback if exception
					frappe.db.rollback()

					create_import_log(
						self.data_import.name,
						log_index,
						{
							"success": False,
							"exception": frappe.get_traceback(),
							"messages": messages,
							"row_indexes": row_indexes,
						},
					)

					log_index += 1

		# Logs are db inserted directly so will have to be fetched again
		import_log = (
			frappe.get_all(
				"Data Import Log",
				fields=["row_indexes", "success", "log_index"],
				filters={"data_import": self.data_import.name},
				order_by="log_index",
			)
			or []
		)

		# set status
		failures = [log for log in import_log if not log.get("success")]
		if len(failures) == total_payload_count:
			status = "Pending"
		elif len(failures) > 0:
			status = "Partial Success"
		else:
			status = "Success"

		if self.console:
			self.print_import_log(import_log)
		else:
			self.data_import.db_set("status", status)

		self.after_import()

		return import_log

def link_exists(self, value, df):
		# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
		dt = get_doctype_by_options(df.options)
		key = dt + "::" + cstr(value)
		# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
		if Row.link_values_exist_map.get(key) is None:
			# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
			Row.link_values_exist_map[key] = dt == self.doctype or frappe.db.exists(dt, value)
			# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
		return Row.link_values_exist_map.get(key)

def validate_values(self):
		if not self.df:
			return

		if self.skip_import:
			return

		if not any(self.column_values):
			return

		if self.df.fieldtype == "Link":
			# find all values that dont exist
			values = list({cstr(v) for v in self.column_values if v})
			# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
			dt = get_doctype_by_options(self.df.options)
			if dt == self.doctype: return
			exists = [
				cstr(d.name) for d in frappe.get_all(dt, filters={"name": ("in", values)})
			]
			# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
			not_exists = list(set(values) - set(exists))
			if not_exists:
				missing_values = ", ".join(not_exists)
				message = _("The following values do not exist for {0}: {1}")
				self.warnings.append(
					{
						"col": self.column_number,
						# >>>>>>>>>>>>>>>>>>>>>>>>>>>>
						"message": message.format(dt, missing_values),
						# <<<<<<<<<<<<<<<<<<<<<<<<<<<<
						"type": "warning",
					}
				)
		elif self.df.fieldtype in ("Date", "Time", "Datetime"):
			# guess date/time format
			self.date_format = self.guess_date_format_for_column()
			if not self.date_format:
				if self.df.fieldtype == "Time":
					self.date_format = "%H:%M:%S"
					date_format = "HH:mm:ss"
				else:
					self.date_format = "%Y-%m-%d"
					date_format = "yyyy-mm-dd"

				message = _(
					"{0} format could not be determined from the values in this column. Defaulting to {1}."
				)
				self.warnings.append(
					{
						"col": self.column_number,
						"message": message.format(self.df.fieldtype, date_format),
						"type": "info",
					}
				)
		elif self.df.fieldtype == "Select":
			options = get_select_options(self.df)
			if options:
				values = {cstr(v) for v in self.column_values if v}
				invalid = values - set(options)
				if invalid:
					valid_values = ", ".join(frappe.bold(o) for o in options)
					invalid_values = ", ".join(frappe.bold(i) for i in invalid)
					message = _("The following values are invalid: {0}. Values must be one of {1}")
					self.warnings.append(
						{
							"col": self.column_number,
							"message": message.format(invalid_values, valid_values),
						}
					)

Importer.import_data = import_data
Row.link_exists = link_exists
Column.validate_values = validate_values
