import { PageHeader } from "@/components/ui/primitives";
import { requireSellerShop } from "@/server/seller-session";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requireSellerShop();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Products" title="Add a product" />
      <ProductForm />
    </div>
  );
}
