import { PageHeader } from "@/components/admin/ui";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { requireStaffPage } from "@/lib/auth/guards";

export const metadata = { title: "Nouvelle collection" };

export default async function NewCollection() {
  await requireStaffPage("collections.manage");
  return (
    <>
      <PageHeader title="Nouvelle collection" back={{ href: "/admin/collections", label: "Collections" }} />
      <CollectionForm />
    </>
  );
}
