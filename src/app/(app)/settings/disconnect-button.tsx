"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { disconnectGoogle } from "@/actions/google";
import { Button } from "@/components/ui/button";

export function DisconnectGoogleButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await disconnectGoogle();
          toast.success("Google Calendar disconnected");
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Unplug className="size-4" />
      )}
      Disconnect
    </Button>
  );
}
