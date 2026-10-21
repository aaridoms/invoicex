"use client";

import { getExpense } from "@/lib/data/expenses";
import Link from "next/link";
import { useEffect, useState } from "react";
import ExpenseForm from "./ExpenseForm";

// Carga un gasto y muestra su formulario de edición
export default function ExpenseDetail({ id }) {
  const [expense, setExpense] = useState(undefined); // undefined = cargando

  useEffect(() => {
    getExpense(id)
      .then(setExpense)
      .catch(() => setExpense(null));
  }, [id]);

  if (expense === undefined) {
    return <p className="px-8 py-10 text-sm text-muted">Cargando…</p>;
  }
  if (expense === null) {
    return (
      <div className="px-8 py-10 text-sm">
        <p>No se ha encontrado este gasto.</p>
        <Link href="/expenses" className="mt-2 inline-block text-accent hover:underline">
          Volver a los gastos
        </Link>
      </div>
    );
  }
  return <ExpenseForm key={expense.id} expense={expense} />;
}
