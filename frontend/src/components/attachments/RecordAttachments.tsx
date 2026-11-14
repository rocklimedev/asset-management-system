import { useEffect, useRef, useState } from 'react';
import {
  useGetRecordAttachmentsQuery,
  useUploadRecordAttachmentMutation,
} from '../../services/api/asset.api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from '../ui/toast';
type Pending = { file: File; purpose: 'image' | 'invoice' };
export function usePendingAttachments(open: boolean, recordId?: string) {
  const [files, setFiles] = useState<Pending[]>([]);
  const completed = useRef(new Set<File>());
  const [upload, state] = useUploadRecordAttachmentMutation();
  useEffect(() => {
    setFiles([]);
    completed.current.clear();
  }, [open, recordId]);
  async function save(resource: 'assets' | 'systems', id: string) {
    for (const item of files) {
      if (completed.current.has(item.file)) continue;
      await upload({ resource, id, ...item }).unwrap();
      completed.current.add(item.file);
      setFiles((current) => current.filter((entry) => entry.file !== item.file));
    }
  }
  return { files, setFiles, save, busy: state.isLoading };
}
export function AttachmentFields({
  files,
  setFiles,
  disabled = false,
}: {
  files: Pending[];
  setFiles: React.Dispatch<React.SetStateAction<Pending[]>>;
  disabled?: boolean;
}) {
  const [error, setError] = useState('');
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Images & invoices</h3>
      <p className="text-xs text-muted-foreground">
        Images: JPEG, PNG or WebP, up to 5 MB. Invoices: PDF or image, up to 10 MB. Selected files
        upload when you save.
      </p>
      {(['image', 'invoice'] as const).map((purpose) => (
        <label key={purpose} className="block space-y-1 text-sm">
          <span>{purpose === 'image' ? 'Upload images' : 'Upload invoices'}</span>
          <Input
            type="file"
            multiple
            disabled={disabled}
            accept={
              purpose === 'image'
                ? 'image/jpeg,image/png,image/webp'
                : 'application/pdf,image/jpeg,image/png,image/webp'
            }
            onChange={(event) => {
              const chosen = Array.from(event.target.files || []);
              event.target.value = '';
              const allowed =
                purpose === 'image'
                  ? ['image/jpeg', 'image/png', 'image/webp']
                  : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
              if (
                chosen.some(
                  (file) =>
                    !allowed.includes(file.type) ||
                    file.size === 0 ||
                    file.size > (purpose === 'image' ? 5 : 10) * 1024 * 1024,
                )
              ) {
                setError('Choose a supported file within the size limit.');
                return;
              }
              setError('');
              setFiles((current) => [...current, ...chosen.map((file) => ({ file, purpose }))]);
            }}
          />
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {files.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate">
            {item.purpose === 'image' ? 'Image' : 'Invoice'}: {item.file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
    </section>
  );
}
export function RecordAttachments({
  resource,
  id,
  disabled = false,
  readOnly = false,
}: {
  resource: 'assets' | 'systems';
  id: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { data = [], isLoading, isError } = useGetRecordAttachmentsQuery({ resource, id });
  const pending = usePendingAttachments(true, id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
      {isLoading && <p className="text-xs text-muted-foreground">Loading attachments…</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load attachments.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {data.map((file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-48 rounded-md border p-2 text-sm underline"
          >
            {file.purpose === 'image' && (
              <img
                src={file.url}
                alt={file.name}
                className="mb-1 h-24 w-36 rounded object-contain"
              />
            )}
            <span className="block truncate">
              {file.purpose === 'invoice' ? 'Invoice: ' : ''}
              {file.name}
            </span>
          </a>
        ))}
      </div>
      {!readOnly && (
        <AttachmentFields
          files={pending.files}
          setFiles={pending.setFiles}
          disabled={disabled || saving}
        />
      )}
      {!readOnly && pending.files.length > 0 && (
        <Button
          type="button"
          disabled={disabled || saving}
          onClick={async () => {
            setSaving(true);
            setError('');
            try {
              await pending.save(resource, id);
              toast.add({ title: 'Attachments uploaded', type: 'success' });
            } catch (e) {
              setError(
                (e as { data?: { message?: string } }).data?.message ||
                  'Upload failed. Retry to upload the remaining files.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Uploading…' : 'Upload selected files'}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
