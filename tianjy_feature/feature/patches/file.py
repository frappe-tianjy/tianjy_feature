import os
import os.path
import frappe
from frappe.core.doctype.file.file import File


def save_file_on_filesystem(self):
    from datetime import datetime
    date_str = datetime.now().strftime('%Y/%m/%d/%H_%M_%s_%f')

    if self.is_private:
        self.file_url = f"/private/files/{date_str}/{self.file_name}"
    else:
        self.file_url = f"/files/{date_str}/{self.file_name}"

    fpath = self.write_file()

    return {"file_name": os.path.basename(fpath), "file_url": self.file_url}


def write_file(self):
    """write file to disk with a random name (to compare)"""
    if self.is_remote_file:
        return

    file_path = self.get_full_path()

    if isinstance(self._content, str):
        self._content = self._content.encode()

    os.makedirs(os.path.dirname(file_path), mode=0o777, exist_ok=True)
    with open(file_path, "wb+") as f:
        f.write(self._content)
        os.fsync(f.fileno())

    frappe.local.rollback_observers.append(self)

    return file_path


File.save_file_on_filesystem = save_file_on_filesystem
File.write_file = write_file
