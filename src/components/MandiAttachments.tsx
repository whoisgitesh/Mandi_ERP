import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";

export function MandiAttachments({ mandiPurchaseId }: { mandiPurchaseId: string }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setBusy(true);

    try {
      toast.info(
        `Attachment upload for Mandi Purchase ${mandiPurchaseId} needs a backend file-storage API before it can be enabled.`
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="h-4 w-4 mr-1" />
          {busy ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onUpload}
        />
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground py-2">
          Attachments are disabled until backend file storage APIs are configured for Mandi purchases.
        </p>
      </CardContent>
    </Card>
  );
}
