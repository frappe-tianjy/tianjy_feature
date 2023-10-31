import frappe
from frappe.core.doctype.file.file import File
from frappe.exceptions import DoesNotExistError
from frappe.query_builder import DocType


def make_thumbnail(self: File, *a, **b):
    if self.thumbnail_url: return
    if self.is_private: return
    url = self.file_url
    if not url or not url.endswith(('.jpg', '.jpeg','.png','.bmp')): return
    self.make_thumbnail()


@frappe.whitelist()
def has_permission(file: File | str):
    if isinstance(file, str):
        file_doc: File = frappe.get_doc('File', file)  # type: ignore
        file = file_doc

    if file.is_private:
        return True if file.owner == frappe.session.user else False  # type: ignore

    attached_to_doctype = file.attached_to_doctype  # type: ignore
    if not attached_to_doctype:
        return True if file.has_permission('write') else False
    if not frappe.has_permission(doctype=attached_to_doctype, ptype='write'):
        return False

    attached_to_name = file.attached_to_name  # type: ignore
    if not attached_to_name:
        return True

    doc = None
    try:
        doc = frappe.get_last_doc(attached_to_doctype, {
                                  'name': attached_to_name})
    except DoesNotExistError:
        return True
    return True if not doc or doc.has_permission('write') else False


@frappe.whitelist()
def rename(name: str, filename: str):

    file: File = frappe.get_doc('File', name)  # type: ignore

    if not has_permission(file):
        frappe.throw('无权限修改')

    old_name: str = file.file_name
    ss = old_name.split('.')
    s = len(ss) > 1 and ss.pop() or ''
    ext = f'.{s}' if s else ''

    if ext and filename.endswith(ext):
        filename = filename[:-len(ext)]

    filename = filename.replace('/', '').replace('\\', '')
    if not filename:
        return

    Table = DocType('File')
    (frappe.qb
     .update(Table)
     .set(Table.file_name, filename + ext)
     .where(Table.name == name)
     ).run()
    return True
