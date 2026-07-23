const DRAFT_KEY = "sakura_upload_draft";

/* Simpan draft */
export function saveDraft(data) {
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      fillMode: data.fillMode,
      isUrgent: data.isUrgent,
      isSensitif: data.isSensitif,
      ownerNIPs: data.ownerNIPs,
      form: data.form
        ? {
            ...data.form,
            tanggalUpload: data.form.tanggalUpload
              ? new Date(data.form.tanggalUpload).toISOString()
              : null,
          }
        : {},
      metaData: data.metaData ?? {},
      selectedCategoryId: data.selectedCategoryId ?? null,
      selectedTypeId: data.selectedTypeId ?? null,
      kategoriValue: data.kategoriValue ?? "",
      jenisValue: data.jenisValue ?? "",
      filePreview: data.filePreview ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      fileType: data.fileType ?? null,
      scanPageImages: data.scanPageImages ?? [],
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    try {
      const fallback = { ...data, filePreview: null, scanPageImages: [] };
      saveDraft(fallback);
    } catch {
      console.warn("[UploadDraft] Gagal menyimpan draft:", e);
    }
    return false;
  }
}

/* Baca draft */
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.form?.tanggalUpload) {
      parsed.form.tanggalUpload = new Date(parsed.form.tanggalUpload);
    }
    return parsed;
  } catch {
    return null;
  }
}

/* Hapus draft */
export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function hasDraft() {
  return !!localStorage.getItem(DRAFT_KEY);
}