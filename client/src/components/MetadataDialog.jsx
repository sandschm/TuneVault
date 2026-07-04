import { useState } from 'react';

/**
 * Generic modal form for editing metadata fields.
 * `fields`: [{ key, label, type? }], `initialValues`: keyed by field key.
 * `onSave(values)` may throw — the dialog stays open and shows the error.
 */
export default function MetadataDialog({ title, fields, initialValues, onSave, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.key, initialValues[field.key] ?? ''])),
  );
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="metadata-form" onSubmit={submit}>
          {fields.map((field) => (
            <label key={field.key} className="metadata-field">
              <span>{field.label}</span>
              <input
                type={field.type ?? 'text'}
                min={field.type === 'number' ? 0 : undefined}
                value={values[field.key]}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
            </label>
          ))}
          <div className="metadata-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
