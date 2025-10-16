import InvoicesList from "@/components/InvoicesList";

export const metadata = {
  title: "Historial de facturas | InvoiceX",
};

export default function InvoicesPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Historial de facturas
        </h1>
        <InvoicesList />
      </div>
    </main>
  );
}
