"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReportAction } from "./actions";

type Props = {
  reportId: string;
  label?: string;
  variant?: "icon" | "button";
  redirectAfter?: boolean;
};

export function DeleteReportButton({
  reportId,
  label,
  variant = "icon",
  redirectAfter = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const confirmLabel = label ?? "este relatório";
    if (
      !confirm(
        `Excluir ${confirmLabel}? Esta ação não pode ser desfeita e remove o relatório do histórico do cliente.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteReportAction(reportId, { redirectAfter });
      if (result?.ok === false) {
        toast.error("Erro: " + result.error);
      } else if (!redirectAfter) {
        toast.success("Relatório excluído.");
        router.refresh();
      }
    });
  };

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isPending}
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Excluir relatório
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title="Excluir relatório"
      onClick={onClick}
      disabled={isPending}
      className="hover:bg-red-50 hover:text-red-600"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
