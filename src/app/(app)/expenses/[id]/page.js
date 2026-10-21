import ExpenseDetail from "@/components/expenses/ExpenseDetail";

export const metadata = {
  title: "Gasto | InvoiceX",
};

export default function ExpensePage({ params }) {
  return <ExpenseDetail id={params.id} />;
}
