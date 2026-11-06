import { PageHeader } from "@/components/ui/primitives";
import { requireSellerShop } from "@/server/seller-session";
import { StyleForm } from "../style-form";

export default async function NewStylePage() {
  await requireSellerShop();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Styles" title="Add a style" />
      <StyleForm />
    </div>
  );
}
