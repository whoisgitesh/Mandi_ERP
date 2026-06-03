import { useEffect, useRef, useState } from "react";
import { Upload, Warehouse } from "lucide-react";
import { toast } from "sonner";

const LOGO_KEY = "mandi_erp_company_logo";
const NAME_KEY = "mandi_erp_company_name";

export function CompanyLogo({ collapsed }: { collapsed: boolean }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName] = useState(
    () => localStorage.getItem(NAME_KEY) || "Mandi ERP"
  );
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoUrl(localStorage.getItem(LOGO_KEY));
  }, []);

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      localStorage.setItem(LOGO_KEY, dataUrl);
      setLogoUrl(dataUrl);
      toast.success("Logo updated");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-2 group">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Upload company logo"
        className="relative flex h-8 w-8 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden hover:opacity-80 transition"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
            className="h-full w-full object-cover"
          />
        ) : (
          <Warehouse className="h-4 w-4" />
        )}
        <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40">
          <Upload className="h-3 w-3 text-white" />
        </span>
      </button>
      {!collapsed && (
        <span className="font-semibold text-sidebar-foreground truncate">
          {companyName}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
